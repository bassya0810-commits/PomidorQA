import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";

const rootDir = process.cwd();
const playwrightReportPath = process.env.PLAYWRIGHT_JSON_REPORT || "test-results/playwright.json";
const lintReportPath = process.env.ESLINT_JSON_REPORT || "test-results/eslint.json";

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes} мин ${seconds} с` : `${seconds} с`;
}

function statusIcon(status) {
  return { passed: "✅", failed: "❌", skipped: "⏭️", flaky: "⚠️" }[status] || "⚪";
}

function collectTests(suite, file, tests) {
  const currentFile = suite.file || file;
  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) {
      const resultStatuses = (test.results || []).map((result) => result.status);
      const status =
        test.status === "skipped" || resultStatuses.every((value) => value === "skipped")
          ? "skipped"
          : test.status === "flaky"
            ? "flaky"
            : test.status === "unexpected" || resultStatuses.some((value) => value === "failed")
            ? "failed"
            : "passed";
      const key = `${currentFile}:${spec.title}`;
      const existing = tests.get(key);
      if (!existing || ["failed", "flaky"].includes(status)) {
        tests.set(key, { file: currentFile, title: spec.title, status });
      }
    }
  }
  for (const child of suite.suites || []) collectTests(child, currentFile, tests);
}

function collectFiles(playwrightReport) {
  const tests = new Map();
  for (const suite of playwrightReport?.suites || []) collectTests(suite, "unknown", tests);

  const files = new Map();
  for (const test of tests.values()) {
    const file = files.get(test.file) || {
      file: test.file,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
    };
    file[test.status] += 1;
    files.set(test.file, file);
  }
  return [...files.values()].sort((left, right) => left.file.localeCompare(right.file));
}

function collectLint(lintReport) {
  return (lintReport || [])
    .map((result) => ({
      file: relative(rootDir, result.filePath),
      errors: result.errorCount + result.fatalErrorCount,
      warnings: result.warningCount,
    }))
    .filter((result) => result.errors || result.warnings)
    .sort((left, right) => left.file.localeCompare(right.file));
}

const playwrightReport = readJson(playwrightReportPath);
const lintReport = readJson(lintReportPath);
const stats = playwrightReport?.stats || {};
const files = collectFiles(playwrightReport);
const lintFiles = collectLint(lintReport);
const passed = files.reduce((total, file) => total + file.passed, 0);
const failed = files.reduce((total, file) => total + file.failed, 0);
const skipped = files.reduce((total, file) => total + file.skipped, 0);
const flaky = files.reduce((total, file) => total + file.flaky, 0);
const duration = stats.duration == null ? "н/д" : formatDuration(stats.duration);
const lintErrors = lintFiles.reduce((total, file) => total + file.errors, 0);
const lintWarnings = lintFiles.reduce((total, file) => total + file.warnings, 0);

const lines = [
  "## CI summary",
  "",
  `**Playwright:** ${statusIcon(failed ? "failed" : flaky ? "flaky" : "passed")} ${passed} passed, ${failed} failed, ${skipped} skipped, ${flaky} flaky · время: ${duration}`,
  `**Lint:** ${lintErrors ? "❌" : "✅"} ${lintErrors} errors, ${lintWarnings} warnings`,
  "",
  "### Тесты по файлам",
  "",
  "| Файл | Passed | Failed | Skipped | Flaky |",
  "| --- | ---: | ---: | ---: | ---: |",
];

if (files.length) {
  for (const file of files) {
    lines.push(`| ${file.file} | ${file.passed} | ${file.failed} | ${file.skipped} | ${file.flaky} |`);
  }
} else {
  lines.push("| Нет данных Playwright | — | — | — | — |");
}

lines.push("", "### Lint по файлам", "", "| Файл | Errors | Warnings |", "| --- | ---: | ---: |");
if (lintFiles.length) {
  for (const file of lintFiles) lines.push(`| ${file.file} | ${file.errors} | ${file.warnings} |`);
} else {
  lines.push("| Ошибок и предупреждений нет | 0 | 0 |");
}

const summary = `${lines.join("\n")}\n`;
writeFileSync(process.env.GITHUB_STEP_SUMMARY || "/dev/stdout", summary);
if (process.env.GITHUB_STEP_SUMMARY) console.log(summary);