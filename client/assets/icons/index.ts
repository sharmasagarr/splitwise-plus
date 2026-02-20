import Home from './home.svg';
import Add from './add.svg';
import Message from './message.svg';
import Profile from './profile.svg';
import Groups from './group.svg';
import Notification from './notification.svg';

export const Icons = {
  Home,
  Add,
  Message,
  Profile,
  Groups,
  Notification
};

export type IconName = keyof typeof Icons;
