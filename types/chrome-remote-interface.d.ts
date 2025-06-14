declare module 'chrome-remote-interface' {
  interface ChromeRemoteInterfaceOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    useHostName?: boolean;
    alterPath?: (path: string) => string;
    protocol?: any;
    local?: boolean;
    tab?: any;
  }

  interface ChromeTab {
    id: string;
    type: string;
    title: string;
    url: string;
    webSocketDebuggerUrl?: string;
    devtoolsFrontendUrl?: string;
  }

  interface ChromeRemoteInterface {
    List(options?: ChromeRemoteInterfaceOptions): Promise<ChromeTab[]>;
    (options?: ChromeRemoteInterfaceOptions): Promise<any>;
  }

  const CDP: ChromeRemoteInterface;
  export = CDP;
}