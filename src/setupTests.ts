import '@testing-library/jest-dom';

// rc-motion / React 19 scheduler uses MessageChannel for async scheduling.
// jsdom does not provide it on window, so add a simple polyfill.
if (typeof (globalThis as Record<string, unknown>).MessageChannel === 'undefined') {
    type HandlerFn = ((event: { data: unknown }) => void) | null;

    class FakePort {
        private _other: FakePort | null = null;
        onmessage: HandlerFn = null;

        postMessage(data: unknown) {
            const other = this._other;
            if (other?.onmessage) {
                // Dispatch asynchronously to mimic real MessageChannel semantics
                Promise.resolve().then(() => other.onmessage?.({data}));
            }
        }

        close() {/* noop */
        }

        _link(other: FakePort) {
            this._other = other;
        }
    }

    class FakeMessageChannel {
        port1: FakePort;
        port2: FakePort;

        constructor() {
            this.port1 = new FakePort();
            this.port2 = new FakePort();
            this.port1._link(this.port2);
            this.port2._link(this.port1);
        }
    }

    (globalThis as Record<string, unknown>).MessageChannel = FakeMessageChannel;
}

// antd and rc-* rely on matchMedia (e.g. for responsive components)
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// rc-resize-observer / antd animations use ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {/* noop */
    }

    unobserve() {/* noop */
    }

    disconnect() {/* noop */
    }
};

// Some antd components call scrollTo on list containers
Object.defineProperty(window, 'scrollTo', {value: jest.fn(), writable: true});

// @rc-component/util calls getComputedStyle to measure scrollbar size.
// jsdom does not implement the pseudoElement overload, so we patch it to
// return a safe empty stub when the call would otherwise throw "Not implemented".
const _origGetComputedStyle = window.getComputedStyle.bind(window);
Object.defineProperty(window, 'getComputedStyle', {
    writable: true,
    configurable: true,
    value: (elt: Element, pseudoElt?: string | null) => {
        try {
            return _origGetComputedStyle(elt, pseudoElt ?? undefined);
        } catch {
            // Return a minimal stub so scrollbar-size measurements don't crash
            return {
                getPropertyValue: () => '',
                getPropertyPriority: () => '',
                width: '0px',
                height: '0px',
                padding: '0px',
                paddingLeft: '0px',
                paddingRight: '0px',
                overflow: 'hidden',
            } as unknown as CSSStyleDeclaration;
        }
    },
});

// Suppress known jsdom CSS-in-JS warnings from antd, as well as "Not
// implemented" noise from APIs antd touches that jsdom stubs out.
const originalError = console.error.bind(console);
beforeAll(() => {
    console.error = (...args: unknown[]) => {
        const msg = typeof args[0] === 'string' ? args[0] : String(args[0]);
        if (
            msg.includes('Could not parse CSS stylesheet') ||
            msg.includes('Not implemented:') ||
            msg.includes('Warning: An update to') || // React batching warnings
            (msg.includes('invalid value for the') && msg.includes('css style property'))
        ) {
            return;
        }
        originalError(...args);
    };
});
afterAll(() => {
    console.error = originalError;
});
