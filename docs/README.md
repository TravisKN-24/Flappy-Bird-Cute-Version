# Flappy Bird: Cute Version

A cute full-screen Flappy Bird style browser game made with plain HTML, CSS, and JavaScript.

Made by Travis.

## How to Play

Go to the game website in a web browser.

Controls:

- Click or tap to flap
- Press `Space` or `Arrow Up` to flap

Avoid the pipes and try to beat your high score.

## Features

- Full-screen canvas gameplay
- Main menu with Play, Character Selection, and Quit
- Animated bird using the included sprite frames
- Character color selection
- Score counter during gameplay
- High score saved with `localStorage`
- Game over screen with score and best score
- Pipe difficulty that ramps up over time
- Generated sound effects and background music
- Custom favicon

## Project Files

- `index.html` - Page structure and game screens
- `style.css` - Full-screen layout, menus, buttons, and HUD styling
- `script.js` - Game logic, physics, drawing, scoring, audio, and difficulty
- `favicon.png` - Browser tab icon
- `Gufiao_CuteFlappy_Free/` - Game image assets

## Useful Tweaks

Most gameplay tuning is in `script.js` inside the `world` object:

```js
gravity: 0.42,
lift: -7.45,
pipeSpeed: 2.85,
maxPipeSpeed: 4.1,
startPipeInterval: 2150,
minPipeInterval: 830,
challengeDelay: 9,
rampDuration: 34,
```

Change `lift` to adjust jump strength. More negative values jump higher.

Change `gravity` to adjust how quickly the bird falls.

Change `startPipeInterval` and `minPipeInterval` to control pipe generation speed.

Change `easyGap` and `hardGap` sizing in `resizeCanvas()` to adjust the space between top and bottom pipes.

Bird color options are stored in the `colorVariants` array.

## Notes

This project does not need a build step or external libraries. It runs directly from the HTML file.
