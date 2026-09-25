import test from "node:test";
import assert from "node:assert/strict";
import { loadProjects } from "../src/parser.js";


test("loads and orders project manifests", async () => {
  const projects = await loadProjects("examples/projects");
  assert.equal(projects.length, 2);
  assert.deepEqual(projects.map((project) => project.slug), ["atlas-service-toolkit", "configuration-tooling"]);
});
