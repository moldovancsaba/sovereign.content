const assert = require("assert");
const { normalizeActivityTypes } = require("./normalizeActivityTypes.cjs");

assert.deepEqual(normalizeActivityTypes(["Skating"], "The Rink at Brookfield Place"), ["Ice Skating"]);
assert.deepEqual(normalizeActivityTypes(["Skating"], "Pier 2 Roller Skating"), ["Roller Skating"]);
assert.deepEqual(normalizeActivityTypes(["Dance", "Skating"], "ice rink lessons"), ["Dance", "Ice Skating"]);
assert.deepEqual(normalizeActivityTypes(["Ice Skating"], "anything"), ["Ice Skating"]);
assert.deepEqual(normalizeActivityTypes(["Dance", "Skating"], "Ballet Arts Center"), ["Dance"]);
assert.deepEqual(normalizeActivityTypes(["Skating"], "Homage Skateboard Academy"), ["Skateboarding"]);

console.log("normalizeActivityTypes.test.cjs: ok");
