/** Matches the TreeNode shape returned by GET /viewer/:projectId/structure */
export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  children?: FileNode[];
}

export interface FileContent {
  content: string;
  mimeType: string;
  path: string;
}
