import React from 'react';
import { SvgProps } from 'react-native-svg';
import { Icons, IconName } from '../../assets/icons';

type Props = SvgProps & {
  name: IconName;
};

export default function Icon({ name, ...props }: Props) {
  const SvgIcon = Icons[name];
  return <SvgIcon {...props} />;
}
