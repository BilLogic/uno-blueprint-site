import { ImageIcon, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { ToolLogo, type Tool } from "@/components/icons/ToolLogo";
import { structure } from "@/content/structure";
import type { RowState, Scene } from "@/lib/walkthrough";
import { CARDS_LAYER, CARD_PLACES } from "@/lib/walkthrough-morph";
import { EvidenceLogo, type EvidenceSource } from "./EvidenceLogo";
import s from "./Walkthrough.module.css";

const cx = (...names: unknown[]) => names.filter((name): name is string => typeof name === "string" && name !== "").join(" ");

/** A box's four corners, which the projection lines are drawn from or to. */
const CORNERS = [
  ["top-left", "0", "0"],
  ["top-right", "100%", "0"],
  ["bottom-right", "100%", "100%"],
  ["bottom-left", "0", "100%"],
] as const;

type CornerKind = "tile" | "sheet" | "cell";

function Corners({ kind }: { kind: CornerKind }) {
  return CORNERS.map(([at, left, top]) => (
    <i key={at} className={s.corner} data-corner={kind} data-at={at} style={{ left, top }} />
  ));
}

type Tile = { left: number; top: number; width: number; height: number; label?: string };

/**
 * Two services, three phases, four scenarios; the first tile of each sheet is
 * the one followed down. The phase numbers, like the arrows and chevrons in
 * the panel, are marks in the picture rather than words, so they stay here.
 */
const SHEETS: readonly (readonly Tile[])[] = [
  [
    { left: 8, top: 22, width: 39, height: 56 },
    { left: 53, top: 22, width: 39, height: 56 },
  ],
  [
    { left: 6, top: 26, width: 26, height: 48, label: "1" },
    { left: 37, top: 26, width: 26, height: 48, label: "2" },
    { left: 68, top: 26, width: 26, height: 48, label: "3" },
  ],
  [
    { left: 8, top: 12, width: 39, height: 34 },
    { left: 53, top: 12, width: 39, height: 34 },
    { left: 8, top: 54, width: 39, height: 34 },
    { left: 53, top: 54, width: 39, height: 34 },
  ],
];

/** Which cells of each lane hold something, and the one picked out (lane, step). */
const FILLED = [
  [1, 1, 0, 1, 1, 1],
  [1, 1, 1, 0, 1, 1],
  [0, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 0, 1],
] as const;
const PICKED = [1, 4] as const;

const LANE_COLOURS = [
  "var(--color-lane-user)",
  "var(--color-lane-front)",
  "var(--color-lane-back)",
  "var(--color-lane-support)",
] as const;

/** Evidence attached to the picked cell, with each bar's length in %. */
const EVIDENCE: readonly [EvidenceSource, number][] = [
  ["Notion", 62],
  ["Figma", 48],
  ["Slack", 54],
];

const pct = (n: number) => `${n}%`;

/** A word that starts as a grey bar and becomes text once the blueprint is being read. */
function Word({ children, keyWord }: { children: string; keyWord?: boolean }) {
  return (
    <span className={cx(s.word, keyWord && s.key)}>
      <i />
      <b>{children}</b>
    </span>
  );
}

function Board({ scene }: { scene: Scene }) {
  const { board } = structure;
  const [service, phase, scenario] = board.crumbs;
  return (
    <>
      <div className={s.crumbs}>
        <Word>{service}</Word>
        <s>/</s>
        <Word>{phase}</Word>
        <s>/</s>
        <Word keyWord>{scenario}</Word>
        <em className={s.pathSelect}>
          <Word>{board.path}</Word>
        </em>
      </div>
      <div className={s.grid}>
        <div className={cx(s.row, s.header)}>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        {board.lanes.map((lane, r) => (
          <LaneRow key={lane} lane={lane} r={r} state={scene.rows[r]!} />
        ))}
        <div className={s.columns}>
          {Array.from({ length: 6 }, (_, i) => (
            <i key={i} style={{ "--i": i } as CSSProperties} />
          ))}
        </div>
        {board.lines.map((line, a) => (
          <div
            key={line}
            className={cx(s.line, scene.lines[a]!.on && s.on, scene.lines[a]!.current && s.current)}
            data-line
          >
            <span>{line}</span>
          </div>
        ))}
      </div>
      <Corners kind="sheet" />
    </>
  );
}

function LaneRow({ lane, r, state }: { lane: string; r: number; state: RowState }) {
  return (
    <div
      className={cx(s.row, state.current && s.current, state.dim && s.dim, state.named && s.named)}
      data-row
      style={{ "--lane": LANE_COLOURS[r] } as CSSProperties}
    >
      <em>
        <Word>{lane}</Word>
      </em>
      {FILLED[r]!.map((filled, c) => {
        const picked = r === PICKED[0] && c === PICKED[1];
        return (
          <span key={c} className={cx(s.cell, filled && s.filled, picked && s.picked)}>
            {picked && <Corners kind="cell" />}
          </span>
        );
      })}
    </div>
  );
}

function Panel() {
  const { panel } = structure;
  return (
    <div className={s.panel} data-panel>
      <div className={s.panelTop}>
        <span className={s.bar} />›<span className={s.bar} />›<span className={s.bar} />
        <X strokeWidth={1.75} aria-hidden />
      </div>
      <div className={s.panelImage}>
        <ImageIcon strokeWidth={1.75} aria-hidden />
      </div>
      <div className={s.field}>
        <span className={s.label}>{panel.summary}</span>
        <span className={cx(s.bar, s.long)} />
        <span className={cx(s.bar, s.short)} />
      </div>
      <div className={s.fieldRow}>
        <div className={s.field}>
          <span className={s.label}>{panel.status}</span>
          <span className={s.pill}>{panel.live}</span>
        </div>
        <div className={s.field}>
          <span className={s.label}>{panel.owner}</span>
          <span className={s.owner}>
            <i />
            <span className={s.bar} />
          </span>
        </div>
      </div>
      <div className={s.field}>
        <span className={s.label}>{panel.value}</span>
        <span className={cx(s.bar, s.value)} />
      </div>
      <div className={s.tabs}>
        {panel.tabs.map((tab) => (
          <span key={tab}>{tab}</span>
        ))}
      </div>
      <div className={s.evidence}>
        {EVIDENCE.map(([source, width]) => (
          <div key={source}>
            <i>
              <EvidenceLogo source={source} />
            </i>
            <span className={s.bar} style={{ width: pct(width) }} />
          </div>
        ))}
      </div>
      <div className={s.fieldRow}>
        <div className={s.field}>
          <span className={s.label}>{panel.follows}</span>
          <span className={s.chip}>
            <span className={s.arrow}>↓</span>
            <span className={s.bar} />
          </span>
        </div>
        <div className={s.field}>
          <span className={s.label}>{panel.leadsTo}</span>
          <span className={s.chip}>
            <span className={s.arrow}>→</span>
            <span className={s.bar} />
          </span>
        </div>
      </div>
    </div>
  );
}

/** A grey bar `width` % of its row wide. */
const Bar = ({ width, className }: { width: number; className?: string | undefined }) => (
  <span className={cx(s.bar, className)} style={{ width: pct(width) }} />
);

/**
 * What each context card shows under its title, a sketch of the tool's own
 * page, and any class the card needs to lay that sketch out.
 */
type CardBody = { body: () => ReactNode; cardClass?: string | undefined };

const CARD_BODIES: Record<Tool, CardBody> = {
  Notion: {
    body: () => (
      <>
        <Bar width={92} />
        <Bar width={84} />
        <Bar width={60} />
      </>
    ),
  },
  Slack: {
    body: () => (
      <>
        <p className={s.message}>
          <i />
          <Bar width={78} />
        </p>
        <p className={cx(s.message, s.mine)}>
          <i />
          <Bar width={56} />
        </p>
      </>
    ),
  },
  Figma: {
    body: () => (
      <div className={s.figmaFrame}>
        <i />
        <i />
        <i />
      </div>
    ),
  },
  Linear: {
    body: () => (
      <>
        <div className={s.ticket}>
          <span className={s.status}>{structure.context.ticketStatus}</span>
          <Bar width={40} />
        </div>
        <Bar width={70} />
      </>
    ),
  },
  Mixpanel: {
    body: () => (
      <div className={s.funnel}>
        {[90, 64, 41, 28].map((height) => (
          <i key={height} style={{ "--h": pct(height) } as CSSProperties} />
        ))}
      </div>
    ),
  },
  GitHub: {
    // The diff's lines sit closer together than a card's other rows.
    cardClass: s.diffCard,
    body: () => (
      <>
        <p className={s.code}>
          <Bar width={18} className={s.keyword} />
          <Bar width={42} />
        </p>
        <p className={cx(s.code, s.indent)}>
          <Bar width={58} />
        </p>
        <p className={cx(s.code, s.indent, s.added)}>
          <Bar width={46} />
        </p>
      </>
    ),
  },
};

/**
 * The opening step: six cards, one per place a product team's context lives.
 * They rest scattered (in two columns on a phone) and are drawn by script
 * while they become the stack; once the walkthrough moves on they fade out
 * as the stack they became fades in.
 */
function ContextCards({ done }: { done: boolean }) {
  return (
    <div className={cx(s.context, done && s.done)} style={{ zIndex: CARDS_LAYER }}>
      {structure.context.cards.map((card, i) => {
        const [x, y, r] = CARD_PLACES.wide[i]!;
        const [nx, ny, nr] = CARD_PLACES.narrow[i]!;
        const place = { "--x": `${x}px`, "--y": `${y}px`, "--r": `${r}deg`, "--nx": `${nx}px`, "--ny": `${ny}px`, "--nr": `${nr}deg` };
        return (
          <div
            key={card.tool}
            className={cx(s.card, CARD_BODIES[card.tool].cardClass)}
            data-card
            style={place as CSSProperties}
          >
            <div className={s.cardTitle}>
              <span className={s.cardMark}>
                <ToolLogo tool={card.tool} />
              </span>
              {card.title}
            </div>
            {CARD_BODIES[card.tool].body()}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The stage's contents at one step: the opening context cards, the stack of
 * sheets with the projection lines between them, the board and the two paths
 * behind it, the labels beside the stack, and the picked cell's panel with
 * its beam.
 */
export function StructureScene({ scene }: { scene: Scene }) {
  return (
    <>
      <div className={s.dots} />
      <ContextCards done={!scene.intro} />
      {SHEETS.map((tiles, i) => {
        const sheet = scene.sheets[i]!;
        return (
          <SheetWithLinks key={i} i={i} tiles={tiles} sheet={sheet} linked={scene.links[i]!} />
        );
      })}
      {[1, 0].map((n) => (
        <div
          key={n}
          className={s.ghost}
          data-ghost={n}
          style={{ zIndex: 2 - n, transform: scene.ghosts[n], transitionDelay: `${scene.board.delay}ms` }}
        />
      ))}
      <div
        className={s.board}
        data-board
        style={{ zIndex: 3, transform: scene.board.transform, transitionDelay: `${scene.board.delay}ms` }}
      >
        <Board scene={scene} />
      </div>
      <svg className={cx(s.links, s.beam)} data-beam>
        <g className={cx(scene.open && s.in)} data-beam-shape>
          <polygon />
          <line />
          <line />
        </g>
      </svg>
      {structure.stackTags.map((tag, i) => {
        const state = scene.tags[i]!;
        return (
          <span key={tag} className={cx(s.tag, state.in && s.in, state.current && s.current)} style={{ top: state.top }}>
            <b>{tag}</b>
          </span>
        );
      })}
      <Panel />
    </>
  );
}

function SheetWithLinks({
  i,
  tiles,
  sheet,
  linked,
}: {
  i: number;
  tiles: readonly Tile[];
  sheet: Scene["sheets"][number];
  linked: boolean;
}) {
  return (
    <>
      <div
        className={cx(s.sheet, sheet.gone && s.gone, sheet.out && s.out)}
        data-sheet
        style={
          {
            zIndex: 12 - 2 * i,
            "--i": i,
            transform: sheet.transform,
            transitionDelay: `${sheet.delay}ms`,
          } as CSSProperties
        }
      >
        {tiles.map((tile, t) => (
          <div
            key={t}
            className={cx(s.tile, t === 0 && s.followed)}
            style={{ left: pct(tile.left), top: pct(tile.top), width: pct(tile.width), height: pct(tile.height) }}
          >
            {tile.label}
            {t === 0 && <Corners kind="tile" />}
          </div>
        ))}
        <Corners kind="sheet" />
      </div>
      <svg className={s.links} style={{ zIndex: 11 - 2 * i }}>
        <g className={cx(linked && s.in)} data-link>
          <line />
          <line />
          <line />
          <line />
        </g>
      </svg>
    </>
  );
}
