interface ImportMetaEnv {
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}

declare const process: {
  env?: {
    NODE_ENV?: string;
  };
};
