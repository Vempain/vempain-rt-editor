/**
 * Tests of the page style editor: the CSS text mode and the visual mode edit the same string and the author switches between them.
 */
import React, {useState} from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {PageStyleEditor, type PageStyleEditorProps} from '../PageStyleEditor';

/** The editor as a host form holds it: a controlled string. */
function Host({initial, onChange, ...props}: {initial?: string | null; onChange?: (css: string) => void} & Omit<PageStyleEditorProps, 'value' | 'onChange'>) {
    const [value, setValue] = useState<string | null | undefined>(initial);
    return (
            <>
                <PageStyleEditor {...props} value={value} onChange={(css) => {
                    setValue(css);
                    onChange?.(css);
                }}/>
                <output data-testid="current">{value ?? ''}</output>
            </>
    );
}

function switchTo(mode: 'CSS' | 'Visual') {
    fireEvent.click(screen.getByText(mode));
}

describe('PageStyleEditor', () => {
    it('starts in CSS mode as a plain text area and reports typed CSS', () => {
        const onChange = jest.fn();
        render(<Host initial=".vps-page-canvas { max-width: 60rem; }" onChange={onChange}/>);

        const textarea = screen.getByLabelText('Page style');
        expect(textarea).toHaveValue('.vps-page-canvas { max-width: 60rem; }');
        expect(screen.queryByTestId('vps-page-style-visual')).toBeNull();

        fireEvent.change(textarea, {target: {value: 'p { color: red; }'}});
        expect(onChange).toHaveBeenLastCalledWith('p { color: red; }');
    });

    it('shows the rules of the CSS as cards in visual mode and writes edits back as CSS', () => {
        const onChange = jest.fn();
        render(<Host initial={'.vps-page-canvas { max-width: 60rem; }\n\n.vps-page-canvas h1 { color: #ff0000; }'} onChange={onChange}/>);
        switchTo('Visual');

        const rules = screen.getAllByTestId('vps-page-style-rule');
        expect(rules).toHaveLength(2);
        expect(within(rules[0]).getByLabelText('Page style rule 1 selector')).toHaveValue('.vps-page-canvas');
        expect(within(rules[0]).getByLabelText('Page style rule 1 property 1')).toHaveValue('max-width');
        expect(within(rules[0]).getByLabelText('Page style rule 1 property 1 value')).toHaveValue('60rem');
        // the colour property gets the colour control next to its text value
        expect(within(rules[1]).getByLabelText('Page style rule 2 property 1 value')).toHaveValue('#ff0000');
        expect(rules[1].querySelector('.ant-color-picker-trigger')).not.toBeNull();

        fireEvent.change(within(rules[0]).getByLabelText('Page style rule 1 property 1 value'), {target: {value: '50rem'}});
        expect(onChange).toHaveBeenLastCalledWith('.vps-page-canvas {\n    max-width: 50rem;\n}\n\n.vps-page-canvas h1 {\n    color: #ff0000;\n}');

        // back in CSS mode the text is the serialized form
        switchTo('CSS');
        expect(screen.getByLabelText('Page style')).toHaveValue('.vps-page-canvas {\n    max-width: 50rem;\n}\n\n.vps-page-canvas h1 {\n    color: #ff0000;\n}');
    });

    it('adds a rule on the page canvas, lets the author pick an element and a property, and removes rows and rules', () => {
        const onChange = jest.fn();
        render(<Host initial="" onChange={onChange}/>);
        switchTo('Visual');
        expect(screen.getByText('No rules yet. Add a rule to style an element of the page.')).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('Page style: add rule'));
        const rule = screen.getByTestId('vps-page-style-rule');
        expect(within(rule).getByLabelText('Page style rule 1 selector')).toHaveValue('.vps-page-canvas');
        // an empty row produces no CSS yet
        expect(onChange).toHaveBeenLastCalledWith('');

        fireEvent.change(within(rule).getByLabelText('Page style rule 1 selector'), {target: {value: '.vps-page-canvas p'}});
        fireEvent.change(within(rule).getByLabelText('Page style rule 1 property 1'), {target: {value: 'text-align'}});
        fireEvent.change(within(rule).getByLabelText('Page style rule 1 property 1 value'), {target: {value: 'center'}});
        expect(onChange).toHaveBeenLastCalledWith('.vps-page-canvas p {\n    text-align: center;\n}');

        fireEvent.click(within(rule).getByLabelText('Page style rule 1: add property'));
        fireEvent.change(within(rule).getByLabelText('Page style rule 1 property 2'), {target: {value: 'font-size'}});
        fireEvent.change(within(rule).getByLabelText('Page style rule 1 property 2 value'), {target: {value: '1.2rem'}});
        expect(onChange).toHaveBeenLastCalledWith('.vps-page-canvas p {\n    text-align: center;\n    font-size: 1.2rem;\n}');

        fireEvent.click(within(rule).getByLabelText('Page style rule 1 property 1: remove property'));
        expect(onChange).toHaveBeenLastCalledWith('.vps-page-canvas p {\n    font-size: 1.2rem;\n}');

        fireEvent.click(within(rule).getByLabelText('Page style rule 1: remove rule'));
        expect(onChange).toHaveBeenLastCalledWith('');
        expect(screen.queryByTestId('vps-page-style-rule')).toBeNull();
    });

    it('keeps what it cannot edit visually and says so, and warns about :root rules', () => {
        const onChange = jest.fn();
        render(<Host initial={'/* note */\n@media print { p { display: none; } }\n:root { --accent: #abc; }'} onChange={onChange}/>);
        switchTo('Visual');

        expect(screen.getByText('2 blocks (comments, @-rules or nested rules) kept as written; edit them in CSS mode')).toBeInTheDocument();
        expect(screen.getByText('Rules on :root apply on the website only; the editing canvas cannot preview them')).toBeInTheDocument();
        const raws = screen.getAllByTestId('vps-page-style-raw');
        expect(within(raws[0]).getByLabelText('Page style block 1')).toHaveValue('/* note */');
        expect(within(raws[1]).getByLabelText('Page style block 2')).toHaveValue('@media print { p { display: none; } }');
        // a custom variable is edited as text
        expect(screen.getByLabelText('Page style rule 3 property 1 value')).toHaveValue('#abc');

        fireEvent.change(screen.getByLabelText('Page style rule 3 property 1 value'), {target: {value: '#def'}});
        expect(onChange).toHaveBeenLastCalledWith('/* note */\n\n@media print { p { display: none; } }\n\n:root {\n    --accent: #def;\n}');

        fireEvent.click(within(raws[0]).getByLabelText('Page style block 1: remove block'));
        expect(onChange).toHaveBeenLastCalledWith('@media print { p { display: none; } }\n\n:root {\n    --accent: #def;\n}');
    });

    it('follows a value replaced from outside, such as a loaded page, in visual mode', () => {
        function Outer() {
            const [value, setValue] = useState('p { color: red; }');
            return (
                    <>
                        <PageStyleEditor value={value} onChange={setValue} defaultMode="visual"/>
                        <button onClick={() => setValue('h1 { color: blue; }')}>load</button>
                    </>
            );
        }

        render(<Outer/>);
        expect(screen.getByLabelText('Page style rule 1 selector')).toHaveValue('p');
        fireEvent.click(screen.getByText('load'));
        expect(screen.getByLabelText('Page style rule 1 selector')).toHaveValue('h1');
        expect(screen.getByLabelText('Page style rule 1 property 1 value')).toHaveValue('blue');
    });

    it('offers no editing controls when read-only', () => {
        render(<PageStyleEditor value="p { color: red; }" readOnly defaultMode="visual"/>);
        expect(screen.queryByLabelText('Page style: add rule')).toBeNull();
        expect(screen.queryByLabelText('Page style rule 1: remove rule')).toBeNull();
        expect(screen.queryByLabelText('Page style rule 1: add property')).toBeNull();
        expect(screen.getByLabelText('Page style rule 1 property 1 value')).toHaveAttribute('readonly');
        switchTo('CSS');
        expect(screen.getByLabelText('Page style')).toHaveAttribute('readonly');
    });
});
