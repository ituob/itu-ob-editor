import React from 'react';
import { Button } from '@blueprintjs/core';
import { callIPC } from '@riboseinc/coulomb/ipc/renderer';


const ROOT_HELP_URL = 'https://www.ituob.org/docs/';


export const HelpButton: React.FC<{ path: string, className?: string }> = function ({ path, className }) {
  return (
    <Button
      minimal
      icon="help"
      className={className}
      onClick={() => callIPC('open-arbitrary-window', {
        title: "ITU OB Editor help",
        url: `${ROOT_HELP_URL}${path}`,
        dimensions: { width: 1000 },
      })} />
  );
};
