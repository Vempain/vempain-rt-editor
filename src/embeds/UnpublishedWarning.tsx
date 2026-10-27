import {WarningOutlined} from '@ant-design/icons';
import {Tooltip} from 'antd';
import type {PublishedTimestamp} from '../types';

export const UNPUBLISHED_WARNING_TEXT = 'Not yet published to the website';

/**
 * True when the host said the resource was never published: `published` is explicitly `null`. A host that does not send the field
 * leaves the resource unmarked, because nothing is known about it.
 */
export function isUnpublished(resource: { published?: PublishedTimestamp }): boolean {
    return resource.published === null;
}

/**
 * A small warning triangle shown next to the label of a gallery, site file or data set that has never been published to the website,
 * so an author sees before inserting the embed that the page would refer to something the site cannot show yet.
 */
export function UnpublishedWarning() {
    return (
            <Tooltip title={UNPUBLISHED_WARNING_TEXT}>
                <WarningOutlined
                        className="vps-unpublished-warning"
                        role="img"
                        aria-label={UNPUBLISHED_WARNING_TEXT}
                        style={{color: '#faad14', marginLeft: 6}}
                />
            </Tooltip>
    );
}
