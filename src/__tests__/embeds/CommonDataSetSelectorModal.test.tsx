/**
 * Tests for CommonDataSetSelectorModal – covers data loading, client-side
 * filtering, selection, and error handling.
 */
import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {CommonDataSetSelectorModal} from '../../embeds/CommonDataSetSelectorModal';
import {mockDataSets, renderWithProviders} from '../../test-utils/renderWithProviders';
// ---------------------------------------------------------------------------
// RichEmbedGpsTimeSeriesEditor – delegates to CommonDataSetSelectorModal
// ---------------------------------------------------------------------------
import {RichEmbedGpsTimeSeriesEditor} from '../../embeds/RichEmbedGpsTimeSeriesEditor';

const defaultProps = {
    open: true,
    title: 'Select Data Set',
    searchPlaceholder: 'Search datasets...',
    emptyText: 'No datasets found',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
};

describe('CommonDataSetSelectorModal', () => {
    it('renders the modal title when open', async () => {
        renderWithProviders(<CommonDataSetSelectorModal {...defaultProps}/>);
        expect(await screen.findByText('Select Data Set')).toBeInTheDocument();
    });

    it('calls getAllDataSets when opened', async () => {
        const {providers} = renderWithProviders(<CommonDataSetSelectorModal {...defaultProps}/>);
        await waitFor(() => expect(providers.getAllDataSets).toHaveBeenCalledTimes(1));
    });

    it('passes datasetType and serverSearchTerm to getAllDataSets', async () => {
        const {providers} = renderWithProviders(
                <CommonDataSetSelectorModal
                        {...defaultProps}
                        datasetType="time_series"
                        serverSearchTerm="gps"
                />,
        );
        await waitFor(() => {
            const call = (providers.getAllDataSets as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
            expect(call.type).toBe('time_series');
            expect(call.search).toBe('gps');
        });
    });

    it('loads dataset list from the provider when opened', async () => {
        const {providers} = renderWithProviders(<CommonDataSetSelectorModal {...defaultProps}/>);
        // Verify the provider was called and data was fetched
        await waitFor(() => expect(providers.getAllDataSets).toHaveBeenCalledTimes(1));
        // After loading, the loading indicator should be gone
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    });

    it('renders the select input for dataset identifier', async () => {
        renderWithProviders(<CommonDataSetSelectorModal {...defaultProps}/>);
        expect(await screen.findByRole('combobox')).toBeInTheDocument();
    });

    it('shows error alert when getAllDataSets rejects', async () => {
        renderWithProviders(
                <CommonDataSetSelectorModal {...defaultProps}/>,
                {
                    providerOverrides: {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        getAllDataSets: jest.fn<any>().mockRejectedValue(new Error('fail')),
                    }
                },
        );
        expect(await screen.findByText('Failed to load data sets. Please try again.')).toBeInTheDocument();
    });

    it('OK button is disabled when nothing is selected', async () => {
        renderWithProviders(<CommonDataSetSelectorModal {...defaultProps}/>);
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
        expect(screen.getByRole('button', {name: /ok/i})).toBeDisabled();
    });

    it('pre-selects the initial identifier', async () => {
        renderWithProviders(
                <CommonDataSetSelectorModal
                        {...defaultProps}
                        initialIdentifier={mockDataSets[0].identifier}
                />,
        );
        // The selected label should appear
        expect(await screen.findByText(mockDataSets[0].identifier)).toBeInTheDocument();
    });

    it('calls onCancel when Cancel is clicked', async () => {
        const onCancel = jest.fn();
        renderWithProviders(<CommonDataSetSelectorModal {...defaultProps} onCancel={onCancel}/>);
        await userEvent.click(await screen.findByText('Cancel'));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not render modal content when open=false', () => {
        renderWithProviders(<CommonDataSetSelectorModal {...defaultProps} open={false}/>);
        expect(screen.queryByText('Select Data Set')).not.toBeInTheDocument();
    });

    it('shows description alongside identifier when available', async () => {
        renderWithProviders(<CommonDataSetSelectorModal {...defaultProps}/>);
        const select = await screen.findByRole('combobox');
        await userEvent.click(select);
        // Find a dataset that has a description
        const withDesc = mockDataSets.find(d => d.description);
        if (withDesc?.description) {
            expect(await screen.findByText(withDesc.description)).toBeInTheDocument();
        }
    });
});

/** Identifiers of the options currently rendered in the open dropdown. */
function visibleOptionIdentifiers(): string[] {
    return Array.from(document.querySelectorAll('.ant-select-item-option-content > div:first-child'))
            .map((element) => element.textContent ?? '');
}

describe('CommonDataSetSelectorModal search filter', () => {
    it('filters the options locally by description text', async () => {
        const user = userEvent.setup();
        renderWithProviders(<CommonDataSetSelectorModal {...defaultProps}/>);
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

        await user.type(screen.getByRole('combobox'), 'main music');

        await waitFor(() => expect(visibleOptionIdentifiers()).toEqual(['music_library']));
    });

    it('filters the options locally by data set type', async () => {
        const user = userEvent.setup();
        renderWithProviders(<CommonDataSetSelectorModal {...defaultProps}/>);
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

        await user.type(screen.getByRole('combobox'), 'time_series');

        await waitFor(() => expect(visibleOptionIdentifiers()).toEqual(['gps_timeseries_2023', 'gps_timeseries_2024']));
    });

    it('filters by identifier and ignores items without description or type', async () => {
        const user = userEvent.setup();
        renderWithProviders(
                <CommonDataSetSelectorModal {...defaultProps}/>,
                {
                    providerOverrides: {
                        getAllDataSets: jest.fn().mockResolvedValue([
                            {identifier: 'alpha_set', description: null},
                            {identifier: 'beta_set', type: 'music', description: 'Second'},
                        ]),
                    },
                },
        );
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

        await user.type(screen.getByRole('combobox'), 'ALPHA');

        await waitFor(() => expect(visibleOptionIdentifiers()).toEqual(['alpha_set']));
    });

    it('confirms the identifier chosen from the dropdown', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(<CommonDataSetSelectorModal {...defaultProps} onConfirm={onConfirm}/>);
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(await screen.findByText('Main music library'));
        await waitFor(() => expect(screen.getByRole('button', {name: /ok/i})).not.toBeDisabled());
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));

        expect(onConfirm).toHaveBeenCalledWith('music_library');
    });
});

describe('RichEmbedGpsTimeSeriesEditor', () => {
    it('shows "Insert GPS Time Series Embed" title', async () => {
        renderWithProviders(
                <RichEmbedGpsTimeSeriesEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        expect(await screen.findByText('Insert GPS Time Series Embed')).toBeInTheDocument();
    });

    it('passes type=time_series and search=gps to getAllDataSets', async () => {
        const {providers} = renderWithProviders(
                <RichEmbedGpsTimeSeriesEditor open={true} onConfirm={jest.fn()} onCancel={jest.fn()}/>,
        );
        await waitFor(() => {
            const call = (providers.getAllDataSets as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
            expect(call.type).toBe('time_series');
            expect(call.search).toBe('gps');
        });
    });

    it('calls onConfirm with GPS identifier when pre-selected and OK clicked', async () => {
        const onConfirm = jest.fn();
        const identifier = mockDataSets[0].identifier;
        renderWithProviders(
                <RichEmbedGpsTimeSeriesEditor
                        open={true}
                        initialIdentifier={identifier}
                        onConfirm={onConfirm}
                        onCancel={jest.fn()}
                />,
        );
        await waitFor(() => expect(screen.getByRole('button', {name: /ok/i})).not.toBeDisabled());
        await userEvent.click(screen.getByRole('button', {name: /ok/i}));
        expect(onConfirm).toHaveBeenCalledWith(identifier);
    });

    it('calls onCancel when cancelled', async () => {
        const onCancel = jest.fn();
        renderWithProviders(
                <RichEmbedGpsTimeSeriesEditor open={true} onConfirm={jest.fn()} onCancel={onCancel}/>,
        );
        await userEvent.click(await screen.findByText('Cancel'));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});


