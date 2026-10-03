export type PictureProps = {
  /** The picture plays once this turns true; before then it shows its first frame. */
  running: boolean;
  /** The picture can no longer play true (its layout moved under it) and asks to start again. */
  onStale: () => void;
};
