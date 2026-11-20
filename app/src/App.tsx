import * as Icons from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { About } from "./About";
import "./App.css";
import { CopyButton } from "./CopyButton";
import { examples } from "./examples";
import { IconButton } from "./IconButton";
import { LinkDisplay } from "./LinkDisplay";
import { Settings } from "./Settings";
import { useStore } from "./store";
import { Tooltip } from "./Tooltip";

function LinkSpinner() {
  const [isWorking, setIsWorking] = useState(false);
  const pendingTimeout = useRef<number | null>(null);

  useEffect(
    () =>
      useStore.subscribe((state) => {
        if (pendingTimeout.current) {
          window.clearTimeout(pendingTimeout.current);
        }
        pendingTimeout.current = window.setTimeout(() => {
          pendingTimeout.current = null;
          setIsWorking(state.inputID !== null);
        }, 200);
      }),
    [],
  );

  return isWorking ? <div className="spinner"></div> : null;
}

function LinkInput() {
  const linkInput = useStore((state) => state.linkInput);
  const setLinkInput = useStore((state) => state.setLinkInput);
  const userOptions = useStore((state) => state.userOptions);
  const sendInput = useStore((state) => state.sendInput);
  const formatLinkInput = useStore((state) => state.formatLinkInput);

  return (
    <textarea
      value={linkInput}
      onChange={(e) => {
        setLinkInput(e.target.value);
        if (userOptions.autoSend) {
          sendInput();
        }
      }}
      onBlur={() => {
        if (userOptions.autoFormat) {
          formatLinkInput();
        }
      }}
    />
  );
}

function InputControls() {
  const exampleIndex = useStore((state) => state.exampleIndex);
  const formatLinkInput = useStore((state) => state.formatLinkInput);
  const userOptions = useStore((state) => state.userOptions);
  const sendInput = useStore((state) => state.sendInput);
  const setExample = useStore((state) => state.setExample);

  const pasteInput = async () => {
    const text = await navigator.clipboard.readText();
    useStore.getState().setLinkInput(text);
    useStore.getState().sendInput();
  };

  if (exampleIndex !== null) {
    return (
      <div className="controls">
        <IconButton
          label="Hide examples"
          position="top-left"
          onClick={() => {
            setExample(null);
          }}
        >
          <Icons.BookOpen />
        </IconButton>
        <div className="controls-spacer" />
        <IconButton
          className="secondary"
          label="Previous example"
          onClick={() => {
            setExample(exampleIndex - 1);
          }}
        >
          <Icons.ArrowLeft />
        </IconButton>
        <a
          href={examples[exampleIndex].source}
          target="_blank"
          rel="noreferrer"
        >
          <IconButton label="Source" className="secondary">
            <Icons.ExternalLink />
          </IconButton>
        </a>
        <IconButton
          className="secondary"
          label="Next example"
          onClick={() => {
            setExample(exampleIndex + 1);
          }}
        >
          <Icons.ArrowRight />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="controls">
      <IconButton
        label="Show examples"
        className="secondary"
        position="top-left"
        onClick={() => {
          setExample("last");
        }}
      >
        <Icons.BookOpen />
      </IconButton>
      <div className="controls-spacer" />
      <IconButton
        label="Paste"
        className="secondary"
        onClick={() => void pasteInput()}
      >
        <Icons.ClipboardPaste />
      </IconButton>
      <IconButton
        label="Format"
        className="secondary"
        onClick={formatLinkInput}
      >
        <Icons.BrushCleaning />
      </IconButton>
      {!userOptions.autoSend && (
        <IconButton
          label="Run"
          onClick={() => {
            sendInput(true);
          }}
        >
          <Icons.Play />
        </IconButton>
      )}
    </div>
  );
}

function OutputControls() {
  const getShareLink = useStore((state) => state.getShareLink);

  return (
    <div className="controls">
      <CopyButton content={getShareLink}>
        {({ justCopied, onClick }) => (
          <Tooltip
            content={justCopied ? "Copied!" : "Copy sharing link"}
            position="bottom"
          >
            <button className="secondary" onClick={onClick}>
              {justCopied ? <Icons.Check /> : <Icons.Link />}
            </button>
          </Tooltip>
        )}
      </CopyButton>
      <div className="controls-spacer" />
      <About />
      <Settings />
    </div>
  );
}

function LinkOutput() {
  const puzlinkReady = useStore((state) => state.puzlinkReady);
  const [maxLinks, setMaxLinks] = useState(50);
  const outputLinks = useStore((state) => state.outputLinks);

  if (!puzlinkReady) {
    return (
      <div className="links loading">
        <span className="spinner" /> loading puzlink.js…
      </div>
    );
  }

  return (
    <div className="links">
      {outputLinks.slice(0, maxLinks).map((link, i) => (
        <LinkDisplay key={link.name} link={link} rank={i} />
      ))}
      {maxLinks < outputLinks.length && (
        <button
          onClick={() => {
            setMaxLinks(maxLinks + 50);
          }}
          className="load-more secondary"
        >
          Load more
        </button>
      )}
    </div>
  );
}

function App() {
  const initWorker = useStore((state) => state.initWorker);

  useEffect(() => {
    initWorker();
  }, [initWorker]);

  return (
    <div className="app">
      <div className="input">
        <div className="header">
          <h1>puzlink.js</h1>
          <LinkSpinner />
        </div>
        <LinkInput />
        <InputControls />
      </div>
      <div className="output">
        <OutputControls />
        <LinkOutput />
      </div>
    </div>
  );
}

export default App;
