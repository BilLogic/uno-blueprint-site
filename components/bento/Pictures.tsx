import { ArrowUp, Check, Gem, Search, UserRound } from "lucide-react";
import { bento } from "@/content/bento";
import { typeOut } from "@/lib/bento";
import { ToolLogo } from "@/components/icons/ToolLogo";
import { BOARD, HITS, RESULTS, SOURCE_WIRES, STACKS } from "./geometry";
import styles from "./bento.module.css";
import { vars } from "./vars";

const QUESTION = typeOut(bento.rag.question);

/**
 * Built for RAG: a question, one hit in each lane, one retriever, four ranked
 * results. While it plays the question types itself out and is sent (the
 * arrow leaves, a tick springs in), then the pipeline runs.
 */
export function RagPicture() {
  return (
    <div className={styles.rag}>
      <div className={styles.query}>
        <Search strokeWidth={1.75} />
        <span className={styles.typed}>
          {QUESTION.map(({ letter, delay }, i) => (
            <i key={i} style={vars({ "--d": `${delay}ms` })}>
              {letter}
            </i>
          ))}
          <u className={styles.caret} />
        </span>
        <span className={styles.send}>
          <span className={styles.arrowUp}>
            <ArrowUp strokeWidth={1.75} />
          </span>
          <span className={styles.tick}>
            <Check strokeWidth={1.75} />
          </span>
        </span>
      </div>
      <svg className={styles.retrieval} viewBox="0 0 380 196">
        {HITS.map((_, r) => {
          const y = 67.5 + r * 20;
          const d = `M139 ${y}C160 ${y} 156 98 175 98`;
          return [
            <path key={`w${r}`} className={styles.wire} d={d} />,
            <path
              key={`f${r}`}
              className={`${styles.flow} ${styles.in}`}
              pathLength={1}
              style={vars({ "--n": r })}
              d={d}
            />,
          ];
        })}
        {RESULTS.map(({ y }, i) => {
          const d = `M205 98C226 98 222 ${y} 243 ${y}`;
          return [
            <path key={`w${i}`} className={styles.wire} d={d} />,
            <path
              key={`f${i}`}
              className={`${styles.flow} ${styles.out}`}
              pathLength={1}
              style={vars({ "--n": i })}
              d={d}
            />,
          ];
        })}
        {BOARD.map((row, r) =>
          row.map((filled, c) => (
            <rect
              key={`${r}-${c}`}
              className={`${styles.cell} ${filled ? "" : styles.empty} ${HITS[r] === c ? styles.hit : ""}`}
              style={vars({ "--n": r })}
              x={6 + c * 27}
              y={60 + r * 20}
              width={22}
              height={15}
              rx={3.5}
            />
          )),
        )}
        <circle className={styles.node} cx={190} cy={98} r={15} />
        <circle className={styles.lens} cx={188.5} cy={96.5} r={4.6} />
        <path className={styles.lens} d="M192 100l3.6 3.6" />
        {RESULTS.map(({ y, score }, i) => {
          const top = i === 0 ? styles.top : "";
          return (
            <g key={i}>
              <rect
                className={`${styles.row} ${top}`}
                x={244}
                y={y - 15}
                width={130}
                height={30}
                rx={7}
              />
              <circle className={`${styles.rank} ${top}`} cx={257} cy={y} r={3} />
              <rect
                className={styles.text}
                x={268}
                y={y - 6}
                width={52 - i * 5}
                height={4}
                rx={2}
              />
              <rect
                className={styles.text2}
                x={268}
                y={y + 2}
                width={34 - i * 3}
                height={4}
                rx={2}
              />
              <rect className={styles.track} x={334} y={y - 2} width={30} height={4} rx={2} />
              <rect
                className={`${styles.score} ${top}`}
                style={vars({ "--s": score })}
                x={334}
                y={y - 2}
                width={30}
                height={4}
                rx={2}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** The scale card: one team's flow in the middle; the stacks fill to every service. */
export function ScalePicture() {
  return (
    <div className={styles.scale}>
      {STACKS.map((stack, s) => (
        <div
          key={s}
          className={`${styles.stack} ${"middle" in stack ? styles.middle : ""}`}
          style={vars({ "--n": stack.flows, "--o": `${stack.delay}s` })}
        >
          {Array.from({ length: stack.flows }, (_, k) => (
            <i key={k} style={vars({ "--k": k })} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A word drawn one letter to an element, so each letter can roll on its own beat. */
const rolled = (word: string) =>
  [...word].map((letter, i) => (
    <i key={i} style={vars({ "--i": i })}>
      {letter}
    </i>
  ));

/**
 * Product context, built in: a cell with its owner, status and value, between
 * the steps either side. While it plays, Planned rolls up out of its badge one
 * letter at a time as Live rolls in.
 */
export function ContextPicture() {
  const [before, after] = bento.context.status;
  return (
    <div className={styles.context}>
      <div className={styles.neighbour}>
        <u />
      </div>
      <i className={styles.arrow} />
      <div className={styles.card}>
        <u />
        <u />
        <span className={styles.owner}>
          <UserRound strokeWidth={1.75} />
        </span>
        <span className={styles.status}>
          <em>
            <b>{rolled(before)}</b>
            <b>{rolled(after)}</b>
          </em>
        </span>
        <span className={styles.value}>
          <Gem strokeWidth={1.75} />
          <u />
        </span>
      </div>
      <i className={styles.arrow} />
      <div className={styles.neighbour}>
        <u />
      </div>
    </div>
  );
}

/** Sources stay attached: a cell wired to the doc, the design and the thread behind it. */
export function SourcesPicture() {
  return (
    <div className={styles.sources}>
      <div className={styles.source}>
        <u />
        <u />
      </div>
      <svg className={styles.wires} viewBox="0 0 40 106">
        {SOURCE_WIRES.map((d, j) => (
          <path key={j} style={vars({ "--j": j })} d={d} />
        ))}
      </svg>
      <div className={styles.links}>
        {bento.sources.tools.map((tool, j) => (
          <span key={tool} style={vars({ "--j": j })}>
            <ToolLogo tool={tool} />
            <i />
          </span>
        ))}
      </div>
    </div>
  );
}
