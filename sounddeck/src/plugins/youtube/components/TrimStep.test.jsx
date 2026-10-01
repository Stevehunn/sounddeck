import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TrimStep from "./TrimStep";

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    t: (k) => k,
    currentLang: "fr",
  }),
}));

const info = {
  id: "x",
  title: "Ma vidéo",
  duration: 180,
  thumbnail: "https://thumb.jpg",
  uploader: "Youtuber",
};

describe("TrimStep", () => {
  const baseProps = {
    info,
    isTutorialMode: false,
    start: 0,
    end: 180,
    setStart: vi.fn(),
    setEnd: vi.fn(),
    importing: false,
    onBack: vi.fn(),
    onDownload: vi.fn(),
  };

  it("devrait afficher selectPortion comme titre", () => {
    render(<TrimStep {...baseProps} />);
    expect(screen.getByText("selectPortion")).toBeInTheDocument();
  });

  it("devrait afficher le titre de la vidéo dans le sub", () => {
    render(<TrimStep {...baseProps} />);
    const matches = screen.getAllByText(/Ma vidéo/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("devrait afficher la durée totale", () => {
    render(<TrimStep {...baseProps} />);
    expect(screen.getByText(/ytTrimTotalDuration/)).toBeInTheDocument();
  });

  it("devrait afficher la durée sélectionnée (3:00)", () => {
    render(<TrimStep {...baseProps} start={0} end={180} />);
    // 180s → "3:00"
    expect(screen.getByText("3:00")).toBeInTheDocument();
  });

  it("devrait afficher la durée sélectionnée (0:30)", () => {
    render(<TrimStep {...baseProps} start={60} end={90} />);
    expect(screen.getByText("0:30")).toBeInTheDocument();
  });

  it("devrait appeler setStart via range start", () => {
    const setStart = vi.fn();
    const { container } = render(
      <TrimStep {...baseProps} setStart={setStart} />,
    );
    const ranges = container.querySelectorAll('input[type="range"]');
    fireEvent.change(ranges[0], { target: { value: "30" } });
    expect(setStart).toHaveBeenCalledWith(30);
  });

  it("devrait appeler setEnd via range end", () => {
    const setEnd = vi.fn();
    const { container } = render(<TrimStep {...baseProps} setEnd={setEnd} />);
    const ranges = container.querySelectorAll('input[type="range"]');
    fireEvent.change(ranges[1], { target: { value: "90" } });
    expect(setEnd).toHaveBeenCalledWith(90);
  });

  it("devrait appeler onBack au click", () => {
    const onBack = vi.fn();
    render(<TrimStep {...baseProps} onBack={onBack} />);
    // Le bouton "Retour"
    const backBtns = screen.getAllByText("ytBack");
    fireEvent.click(backBtns[backBtns.length - 1].closest("button"));
    expect(onBack).toHaveBeenCalled();
  });

  it("devrait appeler onDownload au click", () => {
    const onDownload = vi.fn();
    render(<TrimStep {...baseProps} onDownload={onDownload} />);
    fireEvent.click(screen.getByTestId("youtube-download-button"));
    expect(onDownload).toHaveBeenCalled();
  });

  it("devrait désactiver le bouton download si importing", () => {
    render(<TrimStep {...baseProps} importing={true} />);
    expect(screen.getByTestId("youtube-download-button")).toBeDisabled();
  });

  it('devrait afficher "ytDownloading" si importing', () => {
    render(<TrimStep {...baseProps} importing={true} />);
    expect(screen.getByText("ytDownloading")).toBeInTheDocument();
  });

  it("devrait permettre de tout sélectionner", () => {
    const setStart = vi.fn();
    const setEnd = vi.fn();
    render(
      <TrimStep
        {...baseProps}
        start={30}
        end={90}
        setStart={setStart}
        setEnd={setEnd}
      />,
    );

    fireEvent.click(screen.getByText("ytTrimSelectAll"));

    expect(setStart).toHaveBeenCalledWith(0);
    expect(setEnd).toHaveBeenCalledWith(180);
  });

  it("devrait afficher l'uploader", () => {
    render(<TrimStep {...baseProps} />);
    expect(screen.getByText(/Youtuber/)).toBeInTheDocument();
  });

  it("devrait afficher la thumbnail", () => {
    const { container } = render(<TrimStep {...baseProps} />);
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('https://thumb.jpg');
  });

  it('devrait afficher "unknownArtist" si pas d\'uploader', () => {
    render(<TrimStep {...baseProps} info={{ ...info, uploader: null }} />);
    expect(screen.getByText(/unknownArtist/)).toBeInTheDocument();
  });
});
