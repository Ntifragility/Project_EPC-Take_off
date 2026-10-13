import React, { useEffect, useState, useSyncExternalStore } from 'react';
import {
  getSitePrompt,
  settleSitePrompt,
  subscribeSitePrompt,
  type SitePromptRequest
} from './askSite';

const PromptCard: React.FC<{ request: SitePromptRequest }> = ({ request }) => {
  const [value, setValue] = useState(request.defaultValue);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      settleSitePrompt(request.kind === 'alert' ? true : request.kind === 'prompt' ? null : false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [request.kind]);

  const accept = () => {
    settleSitePrompt(request.kind === 'prompt' ? value : true);
  };

  const cancel = () => {
    settleSitePrompt(request.kind === 'prompt' ? null : false);
  };

  return (
    <div className="site-prompt" role="dialog" aria-modal="true" aria-labelledby="site-prompt-message">
      <p id="site-prompt-message" className="site-prompt-message">
        {request.lines
          ? request.lines.map((line, index) => (
            <React.Fragment key={index}>
              {index > 0 && <br />}
              {line.strong ? <strong>{line.text}</strong> : line.text}
            </React.Fragment>
          ))
          : request.message}
      </p>
      {request.kind === 'prompt' && (
        <input
          className="site-prompt-input"
          value={value}
          autoFocus
          aria-label={request.message}
          onChange={event => setValue(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              accept();
            }
          }}
        />
      )}
      <div className={`site-prompt-actions${request.onDownload ? ' is-centered' : ''}`}>
        {request.kind !== 'alert' && (
          <button type="button" className="btn btn-secondary" onClick={cancel}>
            Cancelar
          </button>
        )}
        <button type="button" className="btn btn-primary" autoFocus={request.kind !== 'prompt'} onClick={accept}>
          Aceptar
        </button>
        {request.onDownload && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { void request.onDownload?.(); }}
          >
            Descargar
          </button>
        )}
      </div>
    </div>
  );
};

export const SitePrompt: React.FC = () => {
  const request = useSyncExternalStore(subscribeSitePrompt, getSitePrompt, getSitePrompt);
  if (!request) return null;

  return (
    <div className="site-prompt-overlay">
      <PromptCard key={request.id} request={request} />
    </div>
  );
};
