import { Bloon } from "./Bloon.js";

export class CoconutBloon extends Bloon {
  constructor(path, config = {}) {
    super(path, {
      ...config,
      type: "coconut",
    });
  }
}
