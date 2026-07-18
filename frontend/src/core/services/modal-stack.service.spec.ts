import { ModalStackService } from "./modal-stack.service";

describe("ModalStackService", () => {
  it("reports the last pushed id as top", () => {
    const svc = new ModalStackService();
    const a = svc.push();
    const b = svc.push();

    expect(svc.isTop(a)).toBe(false);
    expect(svc.isTop(b)).toBe(true);
  });

  it("restores the previous top after popping the current one", () => {
    const svc = new ModalStackService();
    const a = svc.push();
    const b = svc.push();

    svc.pop(b);

    expect(svc.isTop(a)).toBe(true);
  });

  it("isTop is false for an empty stack", () => {
    const svc = new ModalStackService();
    expect(svc.isTop(0)).toBe(false);
  });

  it("popping an id that is not on the stack is a no-op", () => {
    const svc = new ModalStackService();
    const a = svc.push();

    svc.pop(9999);

    expect(svc.isTop(a)).toBe(true);
  });
});
