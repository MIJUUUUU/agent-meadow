'use strict';
// Remove a session and all of its descendants, including grandchildren.
function removeFamily(pets, id, cleanup = () => {}) {
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const pet of pets.values()) {
      if (ids.has(pet.parent) && !ids.has(pet.id)) { ids.add(pet.id); changed = true; }
    }
  }
  for (const key of ids) { pets.delete(key); cleanup(key); }
}
module.exports = { removeFamily };
