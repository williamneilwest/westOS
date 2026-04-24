import { Fragment } from 'react';
import { Link } from 'react-router-dom';

const MATCH_PATTERN = /\bLAH[LD][A-Z0-9]+\b|\b\d{3,5}\b/gi;
const DEVICE_PATTERN = /^LAH[LD][A-Z0-9]+$/i;

function isRoomToken(token) {
  return /^\d{3,5}$/.test(token);
}

function shouldSkipRoomMatch(text, start, end) {
  const prevChar = start > 0 ? text[start - 1] : '';
  const nextChar = end < text.length ? text[end] : '';

  // Prevent matching phone fragments like 303-555-1234 or embedded numeric chains.
  if (prevChar === '-' || nextChar === '-') {
    return true;
  }
  if (/\d/.test(prevChar) || /\d/.test(nextChar)) {
    return true;
  }
  if (prevChar === '+' || nextChar === '+') {
    return true;
  }
  return false;
}

export function linkifyText(value) {
  const text = String(value ?? '');
  if (!text) {
    return text;
  }

  const nodes = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MATCH_PATTERN)) {
    const token = match[0];
    const start = match.index ?? 0;
    const end = start + token.length;
    const isDevice = DEVICE_PATTERN.test(token);
    const isRoom = !isDevice && isRoomToken(token);

    if (!isDevice && !isRoom) {
      continue;
    }

    if (isRoom && shouldSkipRoomMatch(text, start, end)) {
      continue;
    }

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    const normalizedQuery = isDevice ? token.toUpperCase() : token;
    const title = isDevice ? 'Search device' : 'Search room';
    const cssClass = isDevice ? 'linkified-token linkified-token--device' : 'linkified-token linkified-token--room';
    nodes.push(
      <Link
        key={`link-${start}-${token}`}
        to={`/app/device-location?query=${encodeURIComponent(normalizedQuery)}`}
        className={cssClass}
        title={title}
        onClick={(event) => {
          // Keep table-row click handlers from hijacking link navigation.
          event.stopPropagation();
        }}
      >
        {token}
      </Link>
    );

    lastIndex = end;
  }

  if (lastIndex === 0) {
    return text;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <Fragment>{nodes}</Fragment>;
}

export default linkifyText;
