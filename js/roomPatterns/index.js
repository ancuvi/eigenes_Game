import { BOSS } from './boss.js';
import { SECRET } from './treasure.js';
import { ONE_DOOR } from './1_door.js';
import { TWO_DOORS } from './2_doors.js';
import { THREE_DOORS } from './3_doors.js';
import { FOUR_DOORS } from './4_doors.js';

const ROOM_TEMPLATES = {
    'BOSS': BOSS,
    'SECRET': SECRET,
    '1_Door': ONE_DOOR,
    '2_Doors': TWO_DOORS,
    '3_Doors': THREE_DOORS,
    '4_Doors': FOUR_DOORS
};

export default ROOM_TEMPLATES;
