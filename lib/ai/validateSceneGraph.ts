import type { GameScene } from '@/types/creation.types';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a scene graph for structural integrity.
 * Checks: startSceneId exists, all nextSceneIds are valid,
 * endings have empty choices, and all scenes are reachable via BFS.
 */
export function validateSceneGraph(
  scenes: GameScene[],
  startSceneId: string
): ValidationResult {
  const errors: string[] = [];
  const sceneIds = new Set(scenes.map((s) => s.id));

  // 1. startSceneId must exist
  if (!sceneIds.has(startSceneId)) {
    errors.push(`startSceneId "${startSceneId}" does not exist in scenes`);
  }

  // 2. All nextSceneIds must reference valid scenes
  for (const scene of scenes) {
    for (const choice of scene.choices) {
      if (!sceneIds.has(choice.nextSceneId)) {
        errors.push(
          `Scene "${scene.id}" has choice pointing to invalid scene "${choice.nextSceneId}"`
        );
      }
    }
  }

  // 3. Ending scenes must have empty choices
  for (const scene of scenes) {
    if (scene.isEnding && scene.choices.length > 0) {
      errors.push(`Ending scene "${scene.id}" should have empty choices`);
    }
    if (!scene.isEnding && scene.choices.length === 0) {
      errors.push(`Non-ending scene "${scene.id}" has no choices`);
    }
  }

  // 4. BFS reachability from startSceneId
  if (sceneIds.has(startSceneId)) {
    const visited = new Set<string>();
    const queue = [startSceneId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const scene = scenes.find((s) => s.id === current);
      if (scene) {
        for (const choice of scene.choices) {
          if (sceneIds.has(choice.nextSceneId)) {
            queue.push(choice.nextSceneId);
          }
        }
      }
    }

    const unreachable = scenes.filter((s) => !visited.has(s.id));
    for (const scene of unreachable) {
      errors.push(`Scene "${scene.id}" is not reachable from "${startSceneId}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}
