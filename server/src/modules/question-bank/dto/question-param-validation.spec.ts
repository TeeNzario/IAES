import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BulkCreateQuestionsDto, QuestionTypeDto } from './create-question.dto';
import { questionParamRangeMessage } from 'src/lib/question-param-limits';

function makeBulkQuestion(
  params: Partial<{
    difficulty_param: number;
    discrimination_param: number;
    guessing_param: number;
  }> = {},
) {
  return plainToInstance(BulkCreateQuestionsDto, {
    questions: [
      {
        question_text: 'What does HTTP status code 201 mean?',
        question_type: QuestionTypeDto.MCQ_SINGLE,
        choices: [
          {
            choice_text: 'Created',
            is_correct: true,
            display_order: 0,
          },
          {
            choice_text: 'OK',
            is_correct: false,
            display_order: 1,
          },
        ],
        difficulty_param: params.difficulty_param ?? 0,
        discrimination_param: params.discrimination_param ?? 1,
        guessing_param: params.guessing_param ?? 0.25,
        knowledge_category_ids: ['1'],
      },
    ],
  });
}

describe('question parameter validation', () => {
  it.each([
    ['difficulty_param', { difficulty_param: -3 }],
    ['difficulty_param', { difficulty_param: 3 }],
    ['discrimination_param', { discrimination_param: 0.5 }],
    ['discrimination_param', { discrimination_param: 2.5 }],
    ['guessing_param', { guessing_param: 0.25 }],
  ] as const)('accepts %s at allowed range boundary', async (_name, params) => {
    await expect(validate(makeBulkQuestion(params))).resolves.toHaveLength(0);
  });

  it.each([
    ['difficulty_param', { difficulty_param: -3.01 }, 'difficulty'],
    ['difficulty_param', { difficulty_param: 3.01 }, 'difficulty'],
    ['discrimination_param', { discrimination_param: 0.49 }, 'discrimination'],
    ['discrimination_param', { discrimination_param: 2.51 }, 'discrimination'],
    ['guessing_param', { guessing_param: 0.24 }, 'guessing'],
    ['guessing_param', { guessing_param: 0.26 }, 'guessing'],
  ] as const)(
    'rejects %s outside the allowed range',
    async (_name, params, messageKey) => {
      const errors = await validate(makeBulkQuestion(params));

      expect(JSON.stringify(errors)).toContain(
        questionParamRangeMessage(messageKey),
      );
    },
  );
});
