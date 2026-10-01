/* Ayuda: docs/AYUDA.md dentro del hub, abierta en la sección de donde se pidió. */

import { useEffect } from 'react';
import { Markdown, Sheet } from '@dc/ui';
import text from '../../../docs/AYUDA.md?raw';

export function Help({ topic, onClose }: { topic: string; onClose: () => void }) {
  useEffect(() => {
    requestAnimationFrame(() => document.getElementById('ayuda-' + topic)?.scrollIntoView({ block: 'start' }));
  }, [topic]);
  return (
    <Sheet onClose={onClose} label="Ayuda" className="help-sheet">
      <Markdown text={text} focus={topic} />
    </Sheet>
  );
}
