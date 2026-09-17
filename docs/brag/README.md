# Brag video

The CC-Track launch video, made with the `/brag` skill.

- `brag.mp4` — the render: 23.7s, 1920x1080. Its first frame is the poster image, `brag.jpg`.
- `share-copy.txt` — the caption to post alongside the video.
- `brag-plan.md` — the storyboard.
- `composition-brief.md` — the handoff brief used to build the composition.

The Hyperframes source project that renders `brag.mp4` lives in
`brag-output/composition/` and is not committed. To re-render, run this from
that directory (needs FFmpeg on PATH):

```
npx hyperframes render --quality delivery --output ../../docs/brag/brag.mp4
```

A fresh render overwrites the baked-in poster frame, so `brag.jpg` has to be re-extracted and overlaid onto frame 0 again (ffmpeg).

Music: "Happy Beats / Business Moves vol. 11" by ende.app (bundled with the
brag skill). Sound effects: Kenney.nl (CC0).
