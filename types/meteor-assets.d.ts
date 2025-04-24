declare const Assets: {
  absoluteFilePath(path: string): string;
  getText(path: string): string;
  getBinary(path: string): ArrayBuffer;
};
