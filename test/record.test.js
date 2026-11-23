import { test, eq } from './harness.js';
import { pickMimeType, extensionOf } from '../js/audio/record.js';

test('picks the first supported mime type, mp4 before webm', () => {
  eq(pickMimeType(() => true), 'audio/mp4');
  eq(pickMimeType((type) => type.startsWith('audio/webm')), 'audio/webm;codecs=opus');
  eq(pickMimeType((type) => type === 'audio/webm'), 'audio/webm');
  eq(pickMimeType(() => false), '');
});

test('file extension follows the mime type', () => {
  eq(extensionOf('audio/mp4'), 'm4a');
  eq(extensionOf('audio/webm;codecs=opus'), 'webm');
  eq(extensionOf('Audio/WebM'), 'webm');
  eq(extensionOf('audio/ogg; codecs=opus'), 'ogg');
  eq(extensionOf('audio/wav'), 'wav');
  eq(extensionOf(''), 'webm');
});
