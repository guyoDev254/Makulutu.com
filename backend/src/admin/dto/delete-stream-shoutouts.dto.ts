import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

const MAX_BULK = 200;

export class DeleteStreamShoutoutsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK)
  @IsUUID('4', { each: true })
  ids!: string[];
}
