import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: "fr" }),
}));

vi.mock("@shared/utils/fileUrl", () => ({
  buildFileUrl: (p) => (p ? `sounddeck-local://file/${p}` : null),
}));

import OutsideCard from "@features/home/OutsideCard";

describe("OutsideCard", () => {
  let onAdd;

  beforeEach(() => {
    vi.clearAllMocks();
    onAdd = vi.fn();
  });

  const renderCard = (sound) =>
    render(<OutsideCard sound={sound} onAdd={onAdd} />);

  it("devrait afficher le nom du son", () => {
    renderCard({ id: "s1", name: "Mon son", emoji: "🔊" });
    expect(screen.getByText("Mon son")).toBeInTheDocument();
  });

  it("devrait afficher l'emoji si pas d'image", () => {
    const { container } = renderCard({ id: "s1", name: "X", emoji: "🎵" });
    expect(container.textContent).toContain("🎵");
  });

  it("devrait afficher l'image si présente", () => {
    const { container } = renderCard({
      id: "s1",
      name: "X",
      image: "/img.png",
    });
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    // Le mock buildFileUrl n'encode pas → on teste juste la présence du path
    expect(img.src).toContain("sounddeck-local://file/");
    expect(img.src).toContain("img.png");
  });

  it("devrait afficher le bouton addToProfile", () => {
    renderCard({ id: "s1", name: "X", emoji: "🔊" });
    expect(screen.getByText("addToProfile")).toBeInTheDocument();
  });

  it("devrait appeler onAdd au click", () => {
    renderCard({ id: "s1", name: "X", emoji: "🔊" });
    fireEvent.click(screen.getByTestId("add-other-sound-s1"));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("devrait exposer le testid dynamique add-other-sound-{id}", () => {
    renderCard({ id: "abc", name: "X", emoji: "🔊" });
    expect(screen.getByTestId("add-other-sound-abc")).toBeInTheDocument();
  });
});
