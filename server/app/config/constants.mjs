const EPD_2in13_V4_WIDTH = 122;
const EPD_2in13_V4_HEIGHT = 250;
const STATUSBAR_HEIGHT = 20;

export const HEIGHT = EPD_2in13_V4_WIDTH - STATUSBAR_HEIGHT;
export const WIDTH = EPD_2in13_V4_HEIGHT;

export const SCREEN_OFF_BASE64 =
  "data:image/svg+xml;base64," +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="250" height="122" viewBox="0 0 250 122"><rect width="250" height="122" fill="black"/></svg>'
  );
