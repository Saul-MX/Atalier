import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage (humo)", () => {
  it("renderiza el encabezado principal dentro de <main>", () => {
    render(<HomePage />);

    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "ATELIER" }),
    ).toBeInTheDocument();
  });
});
