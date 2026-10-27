/**
 * Tests for the warning triangle that marks a resource never published to the website.
 */
import React from 'react';
import {describe, expect, it} from '@jest/globals';
import {render, screen} from '@testing-library/react';
import {isUnpublished, UNPUBLISHED_WARNING_TEXT, UnpublishedWarning} from '../../embeds/UnpublishedWarning';

describe('UnpublishedWarning', () => {
    it('treats only an explicit null as never published', () => {
        expect(isUnpublished({published: null})).toBe(true);
        expect(isUnpublished({published: '2024-01-15T10:30:00Z'})).toBe(false);
        expect(isUnpublished({})).toBe(false);
        expect(isUnpublished({published: undefined})).toBe(false);
    });

    it('renders an accessible warning triangle', () => {
        render(<UnpublishedWarning/>);
        const icon = screen.getByRole('img', {name: UNPUBLISHED_WARNING_TEXT});
        expect(icon).toHaveClass('vps-unpublished-warning');
    });
});
