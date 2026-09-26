import { describe, expect, it } from 'vitest';
import { activityImageUrl } from '../image';

describe('activity images', () => {
  it('allows the canonical Campus Labs image host', () => {
    const url = 'https://se-images.campuslabs.com/clink/images/example.jpeg?preset=med-w';
    expect(activityImageUrl(` ${url} `)).toBe(url);
  });

  it('rejects missing, insecure, and unknown image URLs', () => {
    expect(activityImageUrl(null)).toBeNull();
    expect(activityImageUrl('   ')).toBeNull();
    expect(activityImageUrl('not a url')).toBeNull();
    expect(activityImageUrl('http://se-images.campuslabs.com/clink/images/example.jpeg')).toBeNull();
    expect(activityImageUrl('https://example.com/banner.jpg')).toBeNull();
  });
});
