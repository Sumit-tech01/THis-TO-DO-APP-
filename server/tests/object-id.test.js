import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { toObjectId } from "../utils/object-id.js";

test("toObjectId converts valid string ids", () => {
  const id = new mongoose.Types.ObjectId().toString();
  const objectId = toObjectId(id);

  assert.ok(objectId instanceof mongoose.Types.ObjectId);
  assert.equal(objectId.toString(), id);
});

test("toObjectId passes through ObjectId values", () => {
  const id = new mongoose.Types.ObjectId();
  const objectId = toObjectId(id);

  assert.equal(objectId, id);
});

test("toObjectId throws for invalid ids", () => {
  assert.throws(() => toObjectId("invalid-id"), /Invalid ObjectId/);
});
