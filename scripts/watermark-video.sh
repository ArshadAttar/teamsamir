#!/bin/sh
# Burns the TeamSamir watermark into a web video: a small logo + "TeamSamir" in the bottom-left
# corner and a faint "TeamSamir" in the centre (so it survives cropping). Every site video gets
# this before it goes into public/media/, saved with a "-wm" suffix (a new filename also avoids
# the 30-day /media/ cache).
#
# Usage (from the project root, in Git Bash):
#   sh scripts/watermark-video.sh in.mp4 out-wm.mp4 [logoBottomPercent]
#   logoBottomPercent (optional): put the corner mark's bottom edge at N% of the height instead
#   of the bottom corner, for clips the site crops (About video uses 60).
#
# Needs ffmpeg + ffprobe with drawtext (set FFMPEG / FFPROBE if they aren't on PATH; the npm
# packages ffmpeg-static / ffprobe-static work). Uses Arial Bold from Windows; set FONT elsewhere.
set -e
FFMPEG="${FFMPEG:-ffmpeg}"
FFPROBE="${FFPROBE:-ffprobe}"
FONT="${FONT:-C\\:/Windows/Fonts/arialbd.ttf}"
LOGO="public/media/shared/logo/logo-without-bg.PNG"

W=$("$FFPROBE" -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$1")
H=$("$FFPROBE" -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$1")
M=$(( W < H ? W : H ))
LH=$(( M * 11 / 100 / 2 * 2 ))   # logo height: 11% of the shorter side
PAD=$(( M * 4 / 100 ))           # margin from the edges
FS=$(( M * 46 / 1000 ))          # corner name font size
BIG=$(( M * 11 / 100 ))          # centre name font size
LY=$(( ${3:-0} > 0 ? H * ${3:-0} / 100 - LH : H - LH - PAD ))

FILTER="[1:v]scale=-2:$LH,format=rgba,colorchannelmixer=aa=0.8[lg];[0:v][lg]overlay=x=$PAD:y=$LY[v1];[v1]drawtext=fontfile='$FONT':text='TeamSamir':fontcolor=white@0.2:borderw=1:bordercolor=black@0.1:fontsize=$BIG:x=(w-text_w)/2:y=(h-text_h)/2,drawtext=fontfile='$FONT':text='TeamSamir':fontcolor=white@0.85:borderw=2:bordercolor=black@0.35:fontsize=$FS:x=$PAD+$LH*1.05:y=$LY+$LH/2-text_h/2[v]"

"$FFMPEG" -v error -y -i "$1" -i "$LOGO" -filter_complex "$FILTER" -map "[v]" -map "0:a?" \
  -c:v libx264 -profile:v high -crf 25 -preset slow -pix_fmt yuv420p -c:a copy -movflags +faststart "$2"
