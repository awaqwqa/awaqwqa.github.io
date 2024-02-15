# HgameWeek2Babyre

> 看上去应该是简单的hh 

## 解释部分函数

- `pthread_create` 函数 看名字就应该差不多能推断出来是一个线程创建函数

  ```c
  int pthread_create(pthread_t *thread, const pthread_attr_t *attr,
                     void *(*start_routine) (void *), void *arg);
  ```

  - **thread**: 指向 `pthread_t` 变量的指针，函数成功完成时，这个变量将被填充为新创建线程的线程ID。
  - **attr**: 指向 `pthread_attr_t` 结构体的指针，该结构体指定了新线程的属性。如果此值为 `NULL`，则使用默认属性创建线程。
  - **start_routine**: 指向将由新线程执行的函数的函数指针。这个函数必须返回一个 `void *` 并且接受一个 `void *` 参数。
  - **arg**: 指向将被传递给 `start_routine` 函数的参数的指针。

  - 函数在成功时返回 `0`，在失败时返回非零错误编号。

- `pthread_join` 函数是 POSIX 线程库（pthreads）中的一个函数，用于等待指定的线程结束。

  > 当一个线程结束时，它的资源不会立即被操作系统回收，直到其他线程对其进行了回收操作。`pthread_join` 函数允许一个线程等待另一个线程结束，并回收其资源，类似于进程中的 `wait` 系统调用。

  ```c
  #include <pthread.h>
  
  int pthread_join(pthread_t thread, void **retval);
  
  ```

  - **thread**: 要等待的线程标识符，是调用 `pthread_create` 时创建线程的返回值。
  - **retval**: 指向一个指针的指针，用于接收被等待线程的退出状态。如果不关心退出状态，可以传递 `NULL`。

## 正式做题

- 先大概把类型改改 把变量名字改改

  ```c
  __int64 __fastcall main(__int64 a1, char **a2, char **a3)
  {
    int i; // [rsp+0h] [rbp-40h]
    int j; // [rsp+4h] [rbp-3Ch]
    pthread_t newthread; // [rsp+10h] [rbp-30h] BYREF
    pthread_t v7; // [rsp+18h] [rbp-28h] BYREF
    pthread_t v8; // [rsp+20h] [rbp-20h] BYREF
    pthread_t v9[3]; // [rsp+28h] [rbp-18h] BYREF
  
    v9[2] = __readfsqword(0x28u);
    get_input();
    if ( !__sigsetjmp(env, 1) )
    {
      signal(8, (__sighandler_t)handler);
      for ( i = 0; i <= 5; ++i )
        *((_BYTE *)&value + i) ^= 0x11u;
    }
    sem_init(&sem, 0, 1u);
    sem_init(&stru_557BBE9C2280, 0, 0);
    sem_init(&stru_557BBE9C22A0, 0, 0);
    sem_init(&stru_557BBE9C22C0, 0, 0);
    pthread_create(&newthread, 0LL, (void *(*)(void *))dest0, 0LL);
    pthread_create(&v7, 0LL, dest1, 0LL);
    pthread_create(&v8, 0LL, dest2, 0LL);
    pthread_create(v9, 0LL, dest3, 0LL);
    for ( j = 0; j <= 3; ++j )
      pthread_join(*(&newthread + j), 0LL);
    sub_557BBE9BF803();
    return 0LL;
  }
  ```

### 流程

- 先是get我们的输入 然后在我们输入最后的位置加入249数据

- 对`value`变量xor 我们点入value变量 查看相关引用 发现主要用在加密input上面 并且发现下面这个函数 说明初始值是feifei

  ```c
  void sub_557BBE9BF2E9()
  {
    strcpy((char *)&value, "feifei");
  }
  ```

- 然后分别开启四个函数 并发开启

  - 几乎每个函数都是长这个样子的 我们猜测是每个函数要等待上一个函数执行完毕再执行
  - 真实情况我们以动调为标准

  ```c
  void __fastcall __noreturn dest0(void *a1)
  {
    while ( 1 )
    {
      sem_wait(&sem);
      if ( n > 31 )
        break;
      input[n] += *((char *)&value + (n + 1) % 6) * input[n + 1];
      ++n;
      sem_post(&stru_557BBE9C2280);
    }
    sem_post(&stru_557BBE9C2280);
    pthread_exit(0LL);
  }
  ```

- 最后就是检查input是否为flag了

## 动调

- 由于这题涉及多线程 所以我们就在每个加密函数里面打idapython的脚本 来看看对应函数运行的时候n的值

  ```python
  import idc
  print("dest 0 n:",idc.get_reg_value("eax"))
  ```

  - 类似于这样 也就是在dest函数下面写入对应的脚本 来看看运行的顺序

    ```c
    dest 0 n: 0
    dest 1 n: 1
    dest 2 n: 2
    dest 3 n: 3
    dest 0 n: 4
    dest 1 n: 5
    dest 2 n: 6
    dest 3 n: 7
    dest 0 n: 8
    dest 1 n: 9
    dest 2 n: 10
    dest 3 n: 11
    dest 0 n: 12
    dest 1 n: 13
    dest 2 n: 14
    dest 3 n: 15
    dest 0 n: 16
    dest 1 n: 17
    dest 2 n: 18
    dest 3 n: 19
    dest 0 n: 20
    dest 1 n: 21
    dest 2 n: 22
    dest 3 n: 23
    dest 0 n: 24
    dest 1 n: 25
    dest 2 n: 26
    dest 3 n: 27
    dest 0 n: 28
    dest 1 n: 29
    dest 2 n: 30
    dest 3 n: 31
    dest 0 n: 32
    dest 1 n: 32
    dest 2 n: 32
    dest 3 n: 32
    ```

- 以及value的部分

  ```c
  get_input();
  if ( !__sigsetjmp(env, 1) )
  {
      signal(8, (__sighandler_t)handler);
      for ( i = 0; i <= 5; ++i )
          *((_BYTE *)&value + i) ^= 0x11u;
  }
  ```

  - 这里我们动调发现value的值在xor第三次的时候就终止了 所以参与下面加密函数的value值为:

    ```c
    char value[6] = {
        0x77, 0x74, 0x78, 0x66, 0x65, 0x69
    };
    ```

    

## 脚本

- 流程知道了 反调试知道了 现在提取flag数据进行解密

```c
#include <stdio.h>
char value[6] = {
    0x77, 0x74, 0x78, 0x66, 0x65, 0x69};

unsigned int flag[33] = {
    0x00002F14, 0x0000004E, 0x00004FF3, 0x0000006D, 0x000032D8, 0x0000006D, 0x00006B4B, 0xFFFFFF92,
    0x0000264F, 0x0000005B, 0x000052FB, 0xFFFFFF9C, 0x00002B71, 0x00000014, 0x00002A6F, 0xFFFFFF95,
    0x000028FA, 0x0000001D, 0x00002989, 0xFFFFFF9B, 0x000028B4, 0x0000004E, 0x00004506, 0xFFFFFFDA,
    0x0000177B, 0xFFFFFFFC, 0x000040CE, 0x0000007D, 0x000029E3, 0x0000000F, 0x00001F11, 0x000000FF, 0xFA};

void dest3(int n)
{
    printf("dest3 n:%d\n", n);
    flag[n] ^= flag[n + 1] - value[(n + 1) % 6];
}
void dest2(int n)
{
    printf("dest2 n:%d\n", n);
    flag[n] /= flag[n + 1] + value[(n + 1) % 6];
}
void dest1(int n)
{
    printf("dest1 n:%d\n", n);
    flag[n] += value[(n + 1) % 6] ^ flag[n + 1];
}
void dest0(int n)
{
    printf("dest0 n:%d\n", n);
    flag[n] -= value[(n + 1) % 6] * flag[n + 1];
}

int main()
{
    printf("test");
    for (int i = 31; i >= 0; i--)
    {
        
        switch (i % 4)
        {
        case 3:

            dest3(i);
            break;

        case 2:
            dest2(i);
            break;
        case 1:
            dest1(i);
            break;
        case 0:
            dest0(i);
            break;
        default:
            break;
        }
        /* code */
    }
    printf("\nOutput:\n");
    for (int i = 0; i < 32; i++)
    {
        printf("%c", flag[i]);
        /* code */
    }
}
```

