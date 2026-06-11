import { describe, it, expect } from 'vitest';
import { buildVideoParameters } from './aivideo';

describe('buildVideoParameters', () => {
  it('always includes the prompt', () => {
    expect(buildVideoParameters({ prompt: 'a cat' })).toEqual({ prompt: 'a cat' });
  });

  it('maps common flags to snake_case API keys, omitting unset ones', () => {
    const params = buildVideoParameters({
      prompt: 'a cat',
      'aspect-ratio': '16:9',
      duration: 8,
      resolution: '1080p',
      'negative-prompt': 'blurry',
      'generate-audio': false,
    });
    expect(params).toEqual({
      prompt: 'a cat',
      aspect_ratio: '16:9',
      duration: 8,
      resolution: '1080p',
      negative_prompt: 'blurry',
      generate_audio: false,
    });
  });

  it('splits --reference-images into an array', () => {
    const params = buildVideoParameters({ prompt: 'x', 'reference-images': ' a , b ,c ' });
    expect(params.reference_images).toEqual(['a', 'b', 'c']);
  });

  it('merges --parameters JSON on top, with JSON winning collisions', () => {
    const params = buildVideoParameters(
      { prompt: 'x', duration: 8 },
      '{"duration":4,"first_frame_url":"uuid-1"}'
    );
    expect(params).toEqual({ prompt: 'x', duration: 4, first_frame_url: 'uuid-1' });
  });

  it('includes generate_audio:false (a defined falsy value) but omits undefined flags', () => {
    const params = buildVideoParameters({ prompt: 'x', 'generate-audio': false });
    expect(params).toHaveProperty('generate_audio', false);
    expect(params).not.toHaveProperty('aspect_ratio');
  });

  it('throws a friendly error on malformed --parameters JSON', () => {
    expect(() => buildVideoParameters({ prompt: 'x' }, '{not json')).toThrow('--parameters must be valid JSON');
  });
});
