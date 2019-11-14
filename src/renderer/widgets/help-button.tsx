import React from 'react';
import { Button } from '@blueprintjs/core';
import { openWindow } from 'sse/api/renderer';


export const HelpButton: React.FC<{ path: string, className?: string }> = function ({ path, className }) {
  return (
    <Button className={className} minimal={true} icon="help" onClick={() => openWindow('help', { path })} />
  );
};
