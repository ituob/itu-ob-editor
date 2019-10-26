import { app, Menu, MenuItemConstructorOptions } from 'electron';


interface MenuActions {
  getFileMenuItems: () => MenuItemConstructorOptions[],
  getHelpMenuItems: () => MenuItemConstructorOptions[],
}

export function buildAppMenu ({ getFileMenuItems, getHelpMenuItems }: MenuActions) {
  const template = [

    // { role: 'appMenu' }
    ...(process.platform === 'darwin' ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),

    // { role: 'fileMenu' }
    {
      label: 'File',
      submenu: [
        ...getFileMenuItems(),
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // { role: 'editMenu' }
    {
      label: 'Edit',
      submenu: [
        // { role: 'undo' },
        // { role: 'redo' },
        // { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(process.platform === 'darwin' ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startspeaking' },
              { role: 'stopspeaking' },
            ],
          },
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' },
        ])
      ],
    },

    // { role: 'viewMenu' }
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    { role: 'windowMenu' },

    {
      role: 'help',
      submenu: [
        ...getHelpMenuItems(),
      ],
    },
  ];

  return Menu.buildFromTemplate(template as MenuItemConstructorOptions[]);
};
