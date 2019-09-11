import React from 'react';
import * as styles from './styles.scss';


interface PaneHeaderProps {
  loud?: boolean,
  align?: 'left' | 'right',
  className?: string,
}
export const PaneHeader: React.FC<PaneHeaderProps> = function (props) {
  let alignmentClass: string;
  if (props.align === 'left') {
    alignmentClass = styles.paneHeaderAlignedLeft;
  } else if (props.align === 'right') {
    alignmentClass = styles.paneHeaderAlignedRight;
  } else {
    alignmentClass = '';
  }

  return (
    <h2 className={`
      ${styles.paneHeader}
      ${alignmentClass}
      ${props.className ? props.className : ''}
      ${props.loud ? styles.paneHeaderLoud : ''}
    `}>{props.children}</h2>
  )
};
