import PlayerBase from '../PlayerBase';
import PropertyHandler from '../PropertyHandler';
export default class RulesHandler extends PropertyHandler<string> {
    beforeInit(value: string, player: PlayerBase): void;
}