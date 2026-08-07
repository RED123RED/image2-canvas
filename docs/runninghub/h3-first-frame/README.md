# RunningHub H3 First-Frame Archive

This folder stores the two RunningHub workflow exports currently used by the
Image2 Canvas H3 first-frame video node. The exports are versioned with the
application so their node mappings can be recovered without relying on a
browser history or the Downloads folder.

## Standard

- Workflow ID: `2085564954459066369`
- Workflow URL: `https://www.runninghub.cn/workflow/2085564954459066369`
- Export: `h3-first-frame-standard.api.json`
- Resolution: `1376 x 768` (16:9)
- SHA-256: `96F90029BAD2369F3ABF94FA67BB65BD1D0528B734B899FEC477732784FEF0A0`

## Clear

- Workflow ID: `2085580221075517441`
- Workflow URL: `https://www.runninghub.cn/workflow/2085580221075517441`
- Export: `h3-first-frame-clear.api.json`
- Resolution: `1920 x 1088` (16:9)
- SHA-256: `8EAA56FC905A4AB262EF6B77210671226FF80ADFE9FF1BD3D8A8CD8EEFDA807E`

## API Mapping

Both exports use the following stable first-frame mapping:

- Prompt: node `59`, field `value`
- Duration expression: node `13`, field `expression`
- First-frame image: node `60`, field `image`
- Width: node `46`
- Height: node `78`
- H3 output node: `120` (`MiniMaxH3ImageToVideo`)

The application uses a string-safe duration expression because RunningHub
serializes direct numeric overrides as strings. The first-frame node currently
supports 5 to 15 seconds.

## Safety

These JSON files were checked before archiving and do not contain API keys,
authorization headers, tokens, or passwords. Do not add provider configuration
files or keys to this folder.

When a workflow is changed in RunningHub, export a new API JSON, keep the old
file for rollback, and update this manifest with the new workflow ID, URL,
resolution, node mapping, and SHA-256 checksum.
