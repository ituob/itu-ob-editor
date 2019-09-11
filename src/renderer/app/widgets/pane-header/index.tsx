import React from 'react';
import * as styles from './styles.scss';


interface PaneHeaderProps {
  loud?: boolean,
  headingLevel?: number,
  alignment?: 'left' | 'right',
  className?: string,
}
export const PaneHeader: React.FC<PaneHeaderProps> = function (props) {
  const HeadingTag = `h${props.headingLevel || 2}`;

  let alignmentClass: string;
  if (props.alignment === 'left') {
    alignmentClass = styles.paneHeaderAlignedLeft;
  } else if (props.alignment === 'right') {
    alignmentClass = styles.paneHeaderAlignedRight;
  } else {
    alignmentClass = '';
  }

  return (
    <HeadingTag className={`
      ${styles.paneHeader}
      ${alignmentClass}
      ${props.className ? props.className : ''}
      ${props.loud ? styles.paneHeaderLoud : ''}
    `}>{props.children}</HeadingTag>
  )
};
