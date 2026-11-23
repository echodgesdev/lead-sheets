const CONSTRAINTS = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
};

export async function openMic() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone unavailable');
  return navigator.mediaDevices.getUserMedia(CONSTRAINTS);
}

export function closeMic(stream) {
  for (const track of stream.getTracks()) track.stop();
}
