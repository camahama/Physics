import katex from 'katex';
import type { SimulationId } from '../app/registry';
import type { Language } from '../app/uiText';
import dropletEn from './content/droplet.en.md?raw';
import dropletSv from './content/droplet.sv.md?raw';
import droplet2En from './content/droplet2.en.md?raw';
import droplet2Sv from './content/droplet2.sv.md?raw';
import prismEn from './content/prism.en.md?raw';
import prismSv from './content/prism.sv.md?raw';
import rainbowEn from './content/rainbow.en.md?raw';
import rainbowSv from './content/rainbow.sv.md?raw';
import raytraceEn from './content/raytrace.en.md?raw';
import raytraceSv from './content/raytrace.sv.md?raw';
import refractionEn from './content/refraction.en.md?raw';
import refractionSv from './content/refraction.sv.md?raw';

const DESCRIPTION_IMAGES = import.meta.glob('./images/*', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

type DescriptionBlock =
  | { type: 'heading'; level: 1 | 2; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'image'; src: string; alt: string }
  | { type: 'math'; latex: string };

const DESCRIPTION_TEXT: Record<SimulationId, Record<Language, string>> = {
  refraction: { sv: refractionSv, en: refractionEn },
  prism: { sv: prismSv, en: prismEn },
  raytrace: { sv: raytraceSv, en: raytraceEn },
  droplet: { sv: dropletSv, en: dropletEn },
  droplet2: { sv: droplet2Sv, en: droplet2En },
  rainbow: { sv: rainbowSv, en: rainbowEn },
};

function flushParagraph(buffer: string[], out: DescriptionBlock[]) {
  if (buffer.length === 0) {
    return;
  }
  out.push({ type: 'paragraph', text: buffer.join(' ') });
  buffer.length = 0;
}

function flushList(buffer: string[], out: DescriptionBlock[]) {
  if (buffer.length === 0) {
    return;
  }
  out.push({ type: 'list', items: [...buffer] });
  buffer.length = 0;
}

function renderLatex(latex: string, displayMode: boolean): string {
  return katex.renderToString(latex, {
    throwOnError: false,
    displayMode,
    strict: 'ignore',
  });
}

function renderInlineLatex(text: string): React.ReactNode[] {
  const parts = text.split(/(\$[^$\n]+\$)/g);
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      const latex = part.slice(1, -1);
      return (
        <span
          key={`math-${index}`}
          className="latex-inline"
          dangerouslySetInnerHTML={{ __html: renderLatex(latex, false) }}
        />
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
}

function resolveAssetPath(src: string): string {
  if (/^https?:\/\//.test(src)) {
    return src;
  }

  const normalized = src.startsWith('./') ? src.slice(2) : src;
  const imageKey = `./images/${normalized}`;
  return DESCRIPTION_IMAGES[imageKey] ?? src;
}

function parseDescription(markdown: string): DescriptionBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: DescriptionBlock[] = [];
  const paragraphBuffer: string[] = [];
  const listBuffer: string[] = [];

  let inMathBlock = false;
  const mathBuffer: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '$$') {
      flushParagraph(paragraphBuffer, blocks);
      flushList(listBuffer, blocks);
      if (inMathBlock) {
        blocks.push({ type: 'math', latex: mathBuffer.join('\n').trim() });
        mathBuffer.length = 0;
      }
      inMathBlock = !inMathBlock;
      continue;
    }

    if (inMathBlock) {
      mathBuffer.push(rawLine);
      continue;
    }

    if (line.length === 0) {
      flushParagraph(paragraphBuffer, blocks);
      flushList(listBuffer, blocks);
      continue;
    }

    const imageMatch = line.match(/^!\[(.*?)\]\((.+?)\)$/);
    if (imageMatch) {
      flushParagraph(paragraphBuffer, blocks);
      flushList(listBuffer, blocks);
      blocks.push({ type: 'image', alt: imageMatch[1], src: imageMatch[2] });
      continue;
    }

    if (line.startsWith('# ')) {
      flushParagraph(paragraphBuffer, blocks);
      flushList(listBuffer, blocks);
      blocks.push({ type: 'heading', level: 1, text: line.slice(2).trim() });
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph(paragraphBuffer, blocks);
      flushList(listBuffer, blocks);
      blocks.push({ type: 'heading', level: 2, text: line.slice(3).trim() });
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph(paragraphBuffer, blocks);
      listBuffer.push(line.slice(2).trim());
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph(paragraphBuffer, blocks);
  flushList(listBuffer, blocks);

  return blocks;
}

type DescriptionDocumentProps = {
  simulationId: SimulationId;
  language: Language;
};

export function DescriptionDocument({ simulationId, language }: DescriptionDocumentProps) {
  const source = DESCRIPTION_TEXT[simulationId][language];
  const blocks = parseDescription(source);

  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          if (block.level === 1) {
            return <h3 key={index}>{block.text}</h3>;
          }
          return <h4 key={index}>{block.text}</h4>;
        }

        if (block.type === 'paragraph') {
          return <p key={index}>{renderInlineLatex(block.text)}</p>;
        }

        if (block.type === 'list') {
          return (
            <ul key={index} className="description-list">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlineLatex(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'image') {
          return (
            <figure key={index} className="description-figure">
              <div className="description-figure-art">
                <img className="description-image" src={resolveAssetPath(block.src)} alt={block.alt} />
              </div>
              <figcaption>{block.alt}</figcaption>
            </figure>
          );
        }

        return (
          <div
            key={index}
            className="latex-block"
            dangerouslySetInnerHTML={{ __html: renderLatex(block.latex, true) }}
          />
        );
      })}
    </>
  );
}
