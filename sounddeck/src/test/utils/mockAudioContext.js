// src/test/utils/mockAudioContext.js
export class MockAudioContext { /* ...copie de setup.js */ }
export function installAudioContextMock() {
  global.AudioContext = vi.fn(() => new MockAudioContext())
  global.webkitAudioContext = global.AudioContext
}