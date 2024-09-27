import 'dayjs/locale/ru.js';

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';

dayjs.locale('ru');
dayjs.extend(duration);
dayjs.extend(relativeTime);
