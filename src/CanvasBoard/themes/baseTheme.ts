import * as drawHandlers from '../drawHandlers';
import coordinates from '../drawHandlers/coordinates';
import { CanvasBoardTheme } from '../types';
import gridFieldClear from '../drawHandlers/gridFieldClear';

const baseTheme: CanvasBoardTheme = {
  // grid & star points
  gridLinesWidth: 0.03,
  gridLinesColor: '#654525',
  starColor: '#531',
  starSize: 0.07,
  stoneSize: 0.47,

  // markup
  markupBlackColor: 'rgba(255,255,255,0.9)',
  markupWhiteColor: 'rgba(0,0,0,0.7)',
  markupNoneColor: 'rgba(0,0,0,0.7)',
  markupLinesWidth: 0.05,

  shadowColor: 'rgba(62,32,32,0.5)',
  shadowTransparentColor: 'rgba(62,32,32,0)',
  shadowBlur: 0.25,
  shadowOffsetX: 0.08,
  shadowOffsetY: 0.16,

  // coordinates
  coordinatesHandler: coordinates,
  coordinatesColor: '#531',
  coordinatesX: 'ABCDEFGHJKLMNOPQRSTUVWXYZ',
  coordinatesY: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],

  // other
  font: 'monospace',
  linesShift: -0.5,
  backgroundColor: '#CEB053',
  backgroundImage: '',

  drawHandlers: {
    B: drawHandlers.simpleStone('#222'),
    W: drawHandlers.simpleStone('#eee'),
    CR: drawHandlers.circle,
    LB: drawHandlers.label,
    SQ: drawHandlers.square,
    TR: drawHandlers.triangle,
    MA: drawHandlers.xMark,
    SL: drawHandlers.dot,
    SM: drawHandlers.smileyFace,
    gridFieldClear,
  },
};

export default baseTheme;