declare module 'chrome-remote-interface' {
  interface ChromeRemoteInterfaceOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    useHostName?: boolean;
    alterPath?: (path: string) => string;
    protocol?: any;
    local?: boolean;
    tab?: string;
  }

  interface ChromeTab {
    id: string;
    type: string;
    title: string;
    url: string;
    webSocketDebuggerUrl?: string;
    devtoolsFrontendUrl?: string;
  }

  interface CDPClient {
    Console: {
      enable(): Promise<void>;
      messageAdded?: any;
    };
    Runtime: {
      enable(): Promise<void>;
      exceptionThrown?: any;
    };
    Network: {
      enable(): Promise<void>;
      requestWillBeSent?: any;
      responseReceived?: any;
    };
    close(): Promise<void>;
  }

  interface ChromeRemoteInterface {
    (options?: ChromeRemoteInterfaceOptions): Promise<CDPClient>;
    List(options?: ChromeRemoteInterfaceOptions): Promise<ChromeTab[]>;
  }

  const CDP: ChromeRemoteInterface;
  export default CDP;
}